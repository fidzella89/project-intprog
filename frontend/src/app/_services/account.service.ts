import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, finalize, catchError } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { Account, Role, RegistrationResponse } from '@app/_models';

const baseUrl = `${environment.apiUrl}/accounts`;

@Injectable({ providedIn: 'root' })
export class AccountService {
    private accountSubject: BehaviorSubject<Account | null>;
    public account: Observable<Account | null>;
    private refreshTokenTimeout: any;
    private refreshingToken = false;

    constructor(
        private router: Router,
        private http: HttpClient
    ) {
        this.accountSubject = new BehaviorSubject<Account | null>(null);
        this.account = this.accountSubject.asObservable();
        this.loadStoredAccount();
    }

    private loadStoredAccount() {
        try {
            const storedAccount = localStorage.getItem('account');
            if (storedAccount) {
                const account = JSON.parse(storedAccount);
                this.accountSubject.next(account);
                // Start refresh token timer
                this.startRefreshTokenTimer();
            }
        } catch (error) {
            console.error('Error loading stored account:', error);
            localStorage.removeItem('account');
        }
    }

    public get accountValue() {
        return this.accountSubject.value;
    }

    public get userValue() {
        return this.accountValue;
    }

    public get isAdmin() {
        return this.accountValue?.role === Role.Admin;
    }

    login(email: string, password: string) {
        return this.http.post<Account>(`${baseUrl}/authenticate`, { email, password }, { withCredentials: true })
            .pipe(
                map(account => {
                    this.storeAccount(account);
                    this.startRefreshTokenTimer();
                    return account;
                }),
                catchError(error => {
                    console.error('Login error:', error);
                    return throwError(() => error);
                })
            );
    }

    private storeAccount(account: Account) {
        localStorage.setItem('account', JSON.stringify(account));
        this.accountSubject.next(account);
    }

    logout() {
        this.http.post<any>(`${baseUrl}/revoke-token`, {}, { withCredentials: true })
            .pipe(
                finalize(() => {
                    this.clearAccountData();
                })
            )
            .subscribe();
    }

    private clearAccountData() {
        localStorage.removeItem('account');
        this.stopRefreshTokenTimer();
        this.accountSubject.next(null);
        this.router.navigate(['/account/login']);
    }

    refreshToken() {
        if (this.refreshingToken) {
            return this.account;
        }

        this.refreshingToken = true;
        return this.http.post<Account>(`${baseUrl}/refresh-token`, {}, { withCredentials: true })
            .pipe(
                map(account => {
                    this.storeAccount(account);
                    this.startRefreshTokenTimer();
                    this.refreshingToken = false;
                    return account;
                }),
                catchError(error => {
                    console.error('Token refresh failed:', error);
                    this.clearAccountData();
                    this.refreshingToken = false;
                    return throwError(() => error);
                })
            );
    }

    register(account: Account): Observable<HttpResponse<RegistrationResponse>> {
        return this.http.post<RegistrationResponse>(`${baseUrl}/register`, account, { observe: 'response' });
    }

    verifyEmail(token: string) {
        return this.http.post(`${baseUrl}/verify-email`, { token });
    }

    forgotPassword(email: string) {
        return this.http.post(`${baseUrl}/forgot-password`, { email });
    }

    validateResetToken(token: string) {
        return this.http.post(`${baseUrl}/validate-reset-token`, { token });
    }

    resetPassword(token: string, password: string, confirmPassword: string) {
        return this.http.post(`${baseUrl}/reset-password`, { token, password, confirmPassword });
    }

    getAll() {
        return this.http.get<Account[]>(baseUrl);
    }

    getById(id: string) {
        return this.http.get<Account>(`${baseUrl}/${id}`);
    }

    create(params: any) {
        return this.http.post(baseUrl, params);
    }

    update(id: string, params: any) {
        return this.http.put(`${baseUrl}/${id}`, params)
            .pipe(map((account: any) => {
                // update the current account if it was updated
                if (account.id === this.accountValue?.id) {
                    // publish updated account to subscribers
                    account = { ...this.accountValue, ...account };
                    this.accountSubject.next(account);
                }
                return account;
            }));
    }

    delete(id: string) {
        return this.http.delete(`${baseUrl}/${id}`)
            .pipe(map(x => {
                // auto logout if the logged in account was deleted
                if (id === this.accountValue?.id) {
                    this.logout();
                }
                return x;
            }));
    }

    private startRefreshTokenTimer() {
        if (this.accountValue?.jwtToken) {
            try {
                // parse json object from base64 encoded jwt token
                const jwtBase64 = this.accountValue.jwtToken.split('.')[1];
                const jwtToken = JSON.parse(atob(jwtBase64));

                // set a timeout to refresh the token a minute before it expires
                const expires = new Date(jwtToken.exp * 1000);
                const timeout = expires.getTime() - Date.now() - (60 * 1000);
                
                this.stopRefreshTokenTimer();
                this.refreshTokenTimeout = setTimeout(() => {
                    console.log('Refreshing token...');
                    this.refreshToken().subscribe();
                }, Math.max(0, timeout));
            } catch (error) {
                console.error('Error starting refresh token timer:', error);
                this.clearAccountData();
            }
        }
    }

    private stopRefreshTokenTimer() {
        if (this.refreshTokenTimeout) {
            clearTimeout(this.refreshTokenTimeout);
        }
    }
}