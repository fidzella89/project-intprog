import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpResponse, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, finalize, catchError } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { Account, Role, RegistrationResponse } from '@app/_models';

const baseUrl = `${environment.apiUrl}/accounts`;

export interface IAccountService {
    account: Observable<Account | null>;
    accountValue: Account | null;
    userValue: Account | null;
    isAdmin: boolean;
    clearAccountData(): void;
    login(email: string, password: string): Observable<Account>;
    logout(): Observable<any>;
    refreshToken(): Observable<any>;
    register(account: Account): Observable<HttpResponse<RegistrationResponse>>;
    verifyEmail(token: string): Observable<any>;
    forgotPassword(email: string): Observable<any>;
    validateResetToken(token: string): Observable<any>;
    resetPassword(token: string, password: string, confirmPassword: string): Observable<any>;
    getAll(): Observable<Account[]>;
    getById(id: string): Observable<Account>;
    create(params: any): Observable<any>;
    update(id: string, params: any): Observable<any>;
    delete(id: string): Observable<any>;
}

@Injectable({ providedIn: 'root' })
export class AccountService implements IAccountService {
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
                    console.log('Login response received');
                    
                    if (!account) {
                        throw new Error('Invalid login response');
                    }

                    if (!account.jwtToken) {
                        throw new Error('No JWT token in response');
                    }

                    // Update the account subject
                    this.accountSubject.next(account);
                    
                    // Start the refresh token timer
                    this.startRefreshTokenTimer();
                    
                    return account;
                }),
                catchError(error => {
                    console.error('Login error:', error);
                    this.clearAccountData();
                    
                    if (error.error) {
                        if (error.error.status === 'Inactive') {
                            return throwError(() => 'Account is inactive. Please contact administrator.');
                        }
                        if (error.error.message) {
                            return throwError(() => error.error.message);
                        }
                    }
                    
                    if (error.message) {
                        return throwError(() => error.message);
                    }
                    
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
        // If we're already refreshing, return the current account observable
        if (this.refreshingToken) {
            console.log('Token refresh already in progress, returning current account');
            return this.account;
        }

        // If there's no account, don't attempt to refresh
        if (!this.accountValue) {
            console.log('No account data to refresh token for');
            return throwError(() => new Error('No account data'));
        }

        this.refreshingToken = true;
        console.log('Starting token refresh request');

        return this.http.post<any>(`${baseUrl}/refresh-token`, {}, { 
            withCredentials: true,
            headers: new HttpHeaders({
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            })
        }).pipe(
            map(response => {
                console.log('Token refresh response received');
                
                if (!response) {
                    throw new Error('Empty response from refresh token endpoint');
                }
                
                if (!response.jwtToken) {
                    throw new Error('Invalid refresh token response - no JWT token');
                }
                
                // Update the account subject with the new data
                this.accountSubject.next(response);
                
                // Restart the refresh timer with the new token
                this.startRefreshTokenTimer();
                
                return response;
            }),
            catchError(error => {
                console.error('Token refresh failed:', error);
                
                // Clear account data and stop refresh timer
                this.clearAccountData();
                this.stopRefreshTokenTimer();
                
                // Determine error message
                let errorMessage = 'Failed to refresh token';
                if (error.error?.message) {
                    errorMessage = error.error.message;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                // Redirect to login only if it's an auth error
                if (error.status === 401 || error.status === 403) {
                    this.router.navigate(['/account/login']);
                }
                
                return throwError(() => errorMessage);
            }),
            finalize(() => {
                console.log('Token refresh request completed');
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

    public clearAccountData(): void {
        console.log('Clearing account data');
        this.stopRefreshTokenTimer();
        this.accountSubject.next(null);
        this.refreshingToken = false;
    }

    private startRefreshTokenTimer() {
        try {
            // Parse the JWT token
            const jwtToken = this.accountValue?.jwtToken;
            if (!jwtToken) {
                console.log('No JWT token available, not starting refresh timer');
                return;
            }

            // Parse the token payload
            const jwtPayload = JSON.parse(atob(jwtToken.split('.')[1]));
            const expires = new Date(jwtPayload.exp * 1000);
            const now = new Date();
            
            console.log('Token expires at:', expires.toISOString());
            console.log('Current time:', now.toISOString());

            // Calculate timeout - refresh at 70% of token lifetime instead of fixed time
            const tokenLifetime = expires.getTime() - now.getTime();
            const timeout = Math.floor(tokenLifetime * 0.7);

            if (timeout <= 0) {
                console.log('Token already expired or about to expire');
                this.clearAccountData();
                this.router.navigate(['/account/login']);
                return;
            }

            console.log(`Setting refresh timer for ${timeout}ms (${new Date(now.getTime() + timeout).toISOString()})`);
            
            // Clear any existing timer
            this.stopRefreshTokenTimer();

            // Set new timer
            this.refreshTokenTimeout = setTimeout(() => {
                console.log('Token refresh timer triggered');
                if (!this.refreshingToken) {
                    console.log('Starting token refresh');
                    this.refreshToken().subscribe({
                        next: () => {
                            console.log('Token refresh successful');
                        },
                        error: (error) => {
                            console.error('Failed to refresh token:', error);
                            this.clearAccountData();
                            this.router.navigate(['/account/login']);
                        }
                    });
                } else {
                    console.log('Token refresh already in progress');
                }
            }, Math.max(0, timeout));

        } catch (error) {
            console.error('Error starting refresh token timer:', error);
            this.clearAccountData();
            this.router.navigate(['/account/login']);
        }
    }

    private stopRefreshTokenTimer() {
        if (this.refreshTokenTimeout) {
            clearTimeout(this.refreshTokenTimeout);
            this.refreshTokenTimeout = null;
        }
    }
}