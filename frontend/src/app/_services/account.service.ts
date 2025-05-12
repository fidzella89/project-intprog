import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpResponse, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
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
    updateStoredAccount(account: Account): void;
}

@Injectable({ providedIn: 'root' })
export class AccountService implements IAccountService {
    private accountSubject: BehaviorSubject<Account | null>;
    public account: Observable<Account | null>;
    private refreshTokenTimeout: any;
    private refreshingToken = false;
    // Track the last time we refreshed the token
    private lastTokenRefresh: number = 0;
    // Minimum time between refreshes in ms (2 minutes)
    private readonly MIN_REFRESH_INTERVAL = 2 * 60 * 1000;
    private readonly TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds

    constructor(
        private router: Router,
        private http: HttpClient
    ) {
        // Initialize account from localStorage on page refresh/load
        const storedAccount = this.getStoredAccount();
        this.accountSubject = new BehaviorSubject<Account | null>(storedAccount);
        this.account = this.accountSubject.asObservable();
        
        // If we have a stored account with a JWT token, start the refresh timer
        if (storedAccount?.jwtToken) {
            this.startRefreshTokenTimer();
    }
    }
    
    // Helper method to get stored account data
    private getStoredAccount(): Account | null {
        try {
            const storedAccount = sessionStorage.getItem('account');
            if (storedAccount) {
                return JSON.parse(storedAccount);
            }
        } catch (error) {
            console.error('Error reading stored account:', error);
        }
        return null;
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
                    if (!account) {
                        throw new Error('Invalid login response');
                    }

                    if (!account.jwtToken) {
                        throw new Error('No JWT token in response');
                    }

                    // Store account data in sessionStorage
                    sessionStorage.setItem('account', JSON.stringify(account));

                    // Update the account subject
                    this.accountSubject.next(account);
                    
                    // Start the refresh token timer
                    this.startRefreshTokenTimer();
                    
                    return account;
                }),
                catchError(error => {
                    // Log the complete error structure for debugging
                    console.error('Login error object:', error);
                    console.error('Error response body:', error.error);
                    console.error('Error status:', error.status);
                    console.error('Error URL:', error.url);
                    this.clearAccountData();
                    
                    // For authentication endpoint errors, extract specific error information
                    if (error.url && error.url.includes('/authenticate')) {
                        // Check for detailed error information in the error object
                        if (error.error) {
                            // Handle object error responses
                            if (typeof error.error === 'object') {
                                // Check for structured error with errorType
                                if (error.error.errorType && error.error.message) {
                                    // Pass the structured error object for special handling in the component
                                    return throwError(() => error.error);
                                }
                                
                                // Use the message property directly from the response
                                if (error.error.message) {
                                    return throwError(() => error.error.message);
                                }
                            }
                            
                            // If error.error is a string, use it directly
                            if (typeof error.error === 'string') {
                                return throwError(() => error.error);
                            }
                        }
                        
                        // For 401 status (unauthorized), return appropriate message
                        if (error.status === 401) {
                            // Check if there's a message in the error response
                            if (error.error && error.error.message) {
                                return throwError(() => error.error.message);
                            }
                            return throwError(() => 'Authentication failed');
                        }
                        
                        // For 403 status (forbidden), handle account issues
                        if (error.status === 403) {
                            // Check if there's a structured error with errorType
                            if (error.error && error.error.errorType) {
                                return throwError(() => error.error);
                            }
                            
                            // Check if there's a message in the error response
                            if (error.error && error.error.message) {
                                return throwError(() => error.error.message);
                            }
                            return throwError(() => 'Your account has an issue. It may be unverified or inactive.');
                        }
                    }
                    
                    // If there is an error message on the error object, use it
                    if (error.message && error.message !== 'Http failure response') {
                        return throwError(() => error.message);
                    }
                    
                    // Fallback generic message only if absolutely nothing else
                    return throwError(() => 'Login failed');
                })
            );
    }

    logout() {
        // Save the current URL before logging out
        const currentUrl = this.router.url;
        if (currentUrl && currentUrl !== '/account/login') {
            sessionStorage.setItem('lastActiveUrl', currentUrl);
        }
        
        // Get the current token from the stored account
        const token = this.accountValue?.jwtToken || '';
        
        // Always complete logout regardless of API response
        const completeLogout = () => {
            this.stopRefreshTokenTimer();
            sessionStorage.removeItem('account');
            this.accountSubject.next(null);
            this.router.navigate(['/account/login']);
        };
        
        // Try to revoke the token, but always complete logout
        return this.http.post<any>(`${baseUrl}/revoke-token`, { token }, { withCredentials: true })
            .pipe(
                catchError(error => {
                    console.error('Token revocation error:', error);
                    // Return an empty observable to prevent error propagation
                    return of({ message: 'Logged out but token revocation failed' });
                }),
                // Always finalize with complete logout
                finalize(() => completeLogout())
            );
    }

    refreshToken() {
        // If we're already refreshing, return the current account observable
        if (this.refreshingToken) {
            return this.account;
        }

        // If there's no account, don't attempt to refresh
        if (!this.accountValue) {
            return throwError(() => new Error('No account data'));
        }

        // Check if we've refreshed the token recently
        const now = Date.now();
        const timeSinceLastRefresh = now - this.lastTokenRefresh;
        if (timeSinceLastRefresh < this.MIN_REFRESH_INTERVAL) {
            return this.account;
        }

        this.refreshingToken = true;

        // The backend expects: token = JWT token
        const jwtToken = this.accountValue.jwtToken;
        
        if (!jwtToken) {
            console.error('No JWT token available for refresh');
            this.refreshingToken = false;
            return throwError(() => new Error('No JWT token available'));
        }
        
        return this.http.post<any>(`${baseUrl}/refresh-token`, {
            token: jwtToken  // Pass JWT token as token parameter
        }, { 
            withCredentials: true,
            headers: new HttpHeaders({
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            })
        }).pipe(
            map(response => {
                if (!response) {
                    throw new Error('Empty response from refresh token endpoint');
                }
                
                if (!response.jwtToken) {
                    throw new Error('Invalid refresh token response - no JWT token');
                }
                
                // Create a complete account object by merging existing account data with new response
                // This preserves any existing account data while updating the tokens
                const updatedAccount = {
                    ...this.accountValue,
                    ...response,
                    jwtToken: response.jwtToken,
                    refreshToken: response.refreshToken || response.token // Handle both formats
                };
                
                // Store updated account in sessionStorage
                sessionStorage.setItem('account', JSON.stringify(updatedAccount));
                
                // Update the account subject with the complete account object
                this.accountSubject.next(updatedAccount);
                
                // Update last refresh timestamp
                this.lastTokenRefresh = Date.now();
                
                // Restart the refresh timer with the new token
                this.startRefreshTokenTimer();
                
                return updatedAccount;
            }),
            catchError(error => {
                console.error('Token refresh failed:', error);
                
                // Don't clear account data here - let the interceptor handle auth errors
                // Only stop the refresh timer
                this.stopRefreshTokenTimer();
                
                // Determine error message
                let errorMessage = 'Failed to refresh token';
                if (error.error?.message) {
                    errorMessage = error.error.message;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                
                // Don't automatically redirect to login - let the interceptor handle this
                // based on status codes and specific error conditions
                
                return throwError(() => errorMessage);
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

    public clearAccountData(): void {
        this.stopRefreshTokenTimer();
        sessionStorage.removeItem('account');
        this.accountSubject.next(null);
        this.refreshingToken = false;
    }

    /**
     * Safely parses a JWT token
     */
    private parseJwt(token: string): any {
        try {
            // Check if the token has three parts (header.payload.signature)
            const parts = token.split('.');
            if (parts.length !== 3) {
                console.warn('Invalid JWT format, expected 3 parts but got', parts.length);
                return null;
            }

            // Base64Url decode the payload
            const base64Url = parts[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );

            return JSON.parse(jsonPayload);
        } catch (e) {
            console.error('Error parsing JWT:', e);
            return null;
        }
    }

    private startRefreshTokenTimer() {
        try {
            // Parse the JWT token
            const jwtToken = this.accountValue?.jwtToken;
            if (!jwtToken) {
                return;
            }

            // Parse the token payload using the safe method
            const jwtPayload = this.parseJwt(jwtToken);
            if (!jwtPayload) {
                console.error('Could not parse JWT token payload');
                return;
            }

            // Verify the expiration is present and valid
            if (!jwtPayload.exp) {
                console.error('JWT token missing expiration claim');
                return;
            }

            const expires = new Date(jwtPayload.exp * 1000);
            const now = new Date();
            
            // Check if token is already expired
            if (expires <= now) {
                // Don't clear account data - attempt a refresh first
                this.refreshToken().subscribe({
                    next: () => {},
                    error: (error) => {
                        console.error('Immediate token refresh failed:', error);
                        // Don't clear account data or redirect here
                        // Let the interceptor handle auth errors appropriately
                    }
                });
                return;
            }

            // Calculate timeout - refresh at 70% of token lifetime
            const tokenLifetime = expires.getTime() - now.getTime();
            
            // Ensure the timeout is at least the minimum refresh interval
            // but not less than 10 seconds to prevent rapid refresh attempts
            const timeout = Math.max(
                Math.floor(tokenLifetime * 0.7),
                this.MIN_REFRESH_INTERVAL,
                10000 // Minimum 10 seconds
            );

            // Check if the token was refreshed very recently, if so, don't schedule another refresh yet
            const timeSinceLastRefresh = Date.now() - this.lastTokenRefresh;
            if (timeSinceLastRefresh < this.MIN_REFRESH_INTERVAL) {
                return;
            }
            
            // Clear any existing timer
                this.stopRefreshTokenTimer();

            // Set new timer
            this.refreshTokenTimeout = setTimeout(() => {
                if (!this.refreshingToken) {
                    this.refreshToken().subscribe({
                        next: () => {},
                        error: (error) => {
                            console.error('Failed to refresh token:', error);
                            // Don't clear account data or redirect here
                            // Let the interceptor handle auth errors appropriately
                        }
                    });
                }
            }, Math.max(0, timeout));
        } catch (error) {
            console.error('Error starting refresh token timer:', error);
            // Do not clear account data or redirect - allow user to continue using the app
        }
    }

    private stopRefreshTokenTimer() {
        if (this.refreshTokenTimeout) {
            clearTimeout(this.refreshTokenTimeout);
            this.refreshTokenTimeout = null;
        }
    }

    /**
     * Updates the accountSubject with a stored account from sessionStorage
     * (Used by the BaseService when it finds a valid token in sessionStorage)
     */
    public updateStoredAccount(account: Account): void {
        if (account && account.jwtToken) {
            // Update the account subject
            this.accountSubject.next(account);
            
            // Restart the refresh timer with the token
            this.startRefreshTokenTimer();
            
            // No need to re-save to sessionStorage as it's already there
        }
    }
}