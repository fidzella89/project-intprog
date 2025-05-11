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
                    console.log('Login response:', account);
                    
                    if (!account) {
                        throw new Error('Invalid login response');
                    }

                    // Update the account subject
                    this.accountSubject.next(account);
                    this.startRefreshTokenTimer();
                    return account;
                }),
                catchError(error => {
                    console.error('Login error details:', error);
                    
                    // Handle specific error responses from the server
                    if (error.error) {
                        if (error.error.status === 'Inactive') {
                            return throwError(() => 'Account is inactive. Please contact administrator.');
                        }
                        if (error.error.message) {
                            return throwError(() => error.error.message);
                        }
                    }
                    
                    // Handle direct error messages
                    if (error.message) {
                        return throwError(() => error.message);
                    }
                    
                    // Fallback error message
                    return throwError(() => 'An error occurred during login. Please try again.');
                })
            );
    }

    logout() {
        return this.http.post<any>(`${baseUrl}/revoke-token`, {}, { withCredentials: true })
            .pipe(
                finalize(() => {
                    this.stopRefreshTokenTimer();
                    this.accountSubject.next(null);
                    this.router.navigate(['/account/login']);
                })
            );
    }

    refreshToken() {
        if (this.refreshingToken) {
            return this.account;
        }

        this.refreshingToken = true;

        return this.http.post<any>(`${baseUrl}/refresh-token`, {}, { 
            withCredentials: true,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        }).pipe(
            map(response => {
                if (!response) {
                    throw new Error('Invalid refresh token response');
                }
                
                // Update the account subject with the new data
                this.accountSubject.next(response);
                
                // Restart the refresh timer
                this.startRefreshTokenTimer();
                
                return response;
            }),
            catchError(error => {
                console.error('Token refresh failed:', error);
                // On refresh failure, clear the account state
                this.stopRefreshTokenTimer();
                this.accountSubject.next(null);
                this.router.navigate(['/account/login']);
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
        // Parse the JWT token
        const jwtToken = this.accountValue?.jwtToken;
        if (!jwtToken) return;

        try {
            const jwtPayload = JSON.parse(atob(jwtToken.split('.')[1]));
            const expires = new Date(jwtPayload.exp * 1000);
            const timeout = expires.getTime() - Date.now() - (60 * 1000); // Refresh 1 minute before expiry

            this.stopRefreshTokenTimer();
            this.refreshTokenTimeout = setTimeout(() => {
                console.log('Token refresh timer triggered');
                this.refreshToken().subscribe();
            }, Math.max(0, timeout));
        } catch (error) {
            console.error('Error starting refresh token timer:', error);
            this.accountSubject.next(null);
        }
    }

    private stopRefreshTokenTimer() {
        if (this.refreshTokenTimeout) {
            clearTimeout(this.refreshTokenTimeout);
            this.refreshTokenTimeout = null;
        }
    }
}