import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpResponse, HttpHeaders } from '@angular/common/http';
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
    private readonly TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds

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
                // Always start the refresh timer when loading stored account
                this.startRefreshTokenTimer();
            }
        } catch (error) {
            console.error('Error loading stored account:', error);
            localStorage.removeItem('account');
        }
    }

    public isTokenValid(account: Account): boolean {
        if (!account || !account.jwtToken) return false;
        
        try {
            const token = account.jwtToken;
            const tokenData = JSON.parse(atob(token.split('.')[1]));
            const expirationTime = tokenData.exp * 1000; // Convert to milliseconds
            
            // Check if token is expired or about to expire
            return Date.now() < (expirationTime - this.TOKEN_REFRESH_THRESHOLD);
        } catch {
            return false;
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
        return this.http.post<any>(`${baseUrl}/revoke-token`, {}, { withCredentials: true })
            .pipe(
                finalize(() => {
                    this.clearAccountData();
                })
            );
    }

    public clearAccountData() {
        localStorage.removeItem('account');
        this.stopRefreshTokenTimer();
        this.accountSubject.next(null);
        // Remove the automatic navigation to prevent routing loops
    }

    refreshToken() {
        if (this.refreshingToken) {
            return this.account;
        }

        this.refreshingToken = true;
        
        return this.http.post<any>(`${baseUrl}/refresh-token`, {}, { 
            withCredentials: true,
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        }).pipe(
            map(account => {
                if (!account || !account.jwtToken) {
                    throw new Error('Invalid refresh token response');
                }
                this.storeAccount(account);
                this.startRefreshTokenTimer();
                return account;
            }),
            catchError(error => {
                console.error('Token refresh failed:', error);
                this.clearAccountData();
                return throwError(() => error);
            }),
            finalize(() => {
                this.refreshingToken = false;
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
        try {
            const account = this.accountSubject.value;
            if (!account?.jwtToken) return;

            const token = account.jwtToken;
            const tokenData = JSON.parse(atob(token.split('.')[1]));
            const expires = new Date(tokenData.exp * 1000);
            const timeout = expires.getTime() - Date.now() - (60 * 1000); // Refresh 1 minute before expiry

            this.stopRefreshTokenTimer();
            if (timeout > 0) {
                this.refreshTokenTimeout = setTimeout(() => {
                    console.log('Token refresh timer triggered');
                    this.refreshToken().subscribe({
                        error: (error) => {
                            console.error('Auto refresh token failed:', error);
                            this.clearAccountData();
                        }
                    });
                }, timeout);
            } else {
                // Token is already expired or about to expire, refresh immediately
                this.refreshToken().subscribe({
                    error: (error) => {
                        console.error('Immediate token refresh failed:', error);
                        this.clearAccountData();
                    }
                });
            }
        } catch (error) {
            console.error('Error starting refresh token timer:', error);
            this.clearAccountData();
        }
    }

    private stopRefreshTokenTimer() {
        if (this.refreshTokenTimeout) {
            clearTimeout(this.refreshTokenTimeout);
        }
    }
}