import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, of } from 'rxjs';
import { catchError, filter, take, switchMap, finalize, tap } from 'rxjs/operators';

import { environment } from '@environments/environment';
import { AccountService } from '@app/_services';
import { Router } from '@angular/router';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
    private isRefreshing = false;
    private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

    constructor(
        private accountService: AccountService,
        private router: Router
    ) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // add auth header with jwt if account is logged in and request is to the api url
        const account = this.accountService.accountValue;
        const isLoggedIn = account?.jwtToken;
        const isApiUrl = request.url.startsWith(environment.apiUrl);
        
        if (isLoggedIn && isApiUrl && !this.isRefreshTokenRequest(request)) {
            request = this.addTokenHeader(request, account.jwtToken || '');
        }

        return next.handle(request).pipe(
            catchError(error => {
                // Don't handle errors for non-API URLs
                if (!isApiUrl) {
                    return throwError(() => error);
                }

                if (error instanceof HttpErrorResponse) {
                    // Handle 401 Unauthorized errors
                    if (error.status === 401) {
                        console.error('401 Unauthorized Error Details:', {
                            url: request.url,
                            error: error.error,
                            message: error.message
                        });
                        
                        // Don't try to refresh token if we're not logged in
                        if (!isLoggedIn) {
                            // Redirect to login page but don't clear data
                            this.router.navigate(['/account/login']);
                            // Extract the most specific error message
                            const errorMsg = this.extractErrorMessage(error);
                            return throwError(() => errorMsg);
                        }
                        
                        // Don't refresh if this is already a refresh token request
                        if (this.isRefreshTokenRequest(request)) {
                            // Clear account data and redirect
                            this.accountService.clearAccountData();
                            this.router.navigate(['/account/login']);
                            // Extract the most specific error message
                            const errorMsg = this.extractErrorMessage(error);
                            return throwError(() => errorMsg);
                        }
                        
                        // Try to refresh the token
                        return this.handle401Error(request, next);
                    } 
                    // Handle 403 Forbidden errors
                    else if (error.status === 403) {
                        console.error('403 Forbidden Error Details:', {
                            url: request.url,
                            error: error.error,
                            message: error.message
                        });
                        
                        // Only logout if we're already logged in
                        if (isLoggedIn) {
                            this.accountService.clearAccountData();
                            this.router.navigate(['/account/login'], { 
                                queryParams: { returnUrl: this.router.url }
                            });
                        }
                        // Extract the most specific error message
                        const errorMsg = this.extractErrorMessage(error);
                        return throwError(() => errorMsg);
                    }
                    // Handle other common errors with specific messages
                    else if (error.status === 404 || error.status === 500 || error.status === 0) {
                        console.error(`${error.status} Error Details:`, {
                            url: request.url,
                            error: error.error,
                            message: error.message
                        });
                        
                        // Extract the most specific error message
                        const errorMsg = this.extractErrorMessage(error);
                        return throwError(() => errorMsg);
                    }
                }
                // Log any other errors
                console.error('Unhandled Error Details:', {
                    url: request.url,
                    error: error.error,
                    message: error.message
                });
                
                // Extract the most specific error message
                const errorMsg = this.extractErrorMessage(error);
                return throwError(() => errorMsg);
            })
        );
    }

    private isRefreshTokenRequest(request: HttpRequest<any>): boolean {
        return request.url.includes('/refresh-token') || request.url.includes('/revoke-token');
    }

    private addTokenHeader(request: HttpRequest<any>, token: string) {
        return request.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`,
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
    }

    private handle401Error(request: HttpRequest<any>, next: HttpHandler) {
        if (!this.isRefreshing) {
            this.isRefreshing = true;
            this.refreshTokenSubject.next(null);

            return this.accountService.refreshToken().pipe(
                switchMap((account: any) => {
                    this.isRefreshing = false;
                    this.refreshTokenSubject.next(account.jwtToken);
                    // Clone the original request with the new token
                    return next.handle(this.addTokenHeader(request, account.jwtToken));
                }),
                catchError(error => {
                    this.isRefreshing = false;
                    console.error('Token refresh error details:', {
                        status: error.status,
                        error: error.error,
                        message: error.message
                    });
                    
                    // Only logout if refresh token fails with auth errors
                    if (error.status === 401 || error.status === 403) {
                        this.accountService.clearAccountData();
                        this.router.navigate(['/account/login']);
                    }
                    // Extract the most specific error message
                    const errorMsg = this.extractErrorMessage(error);
                    return throwError(() => errorMsg);
                }),
                finalize(() => {
                    this.isRefreshing = false;
                })
            );
        }

        return this.refreshTokenSubject.pipe(
            filter(token => token !== null),
            take(1),
            switchMap(token => next.handle(this.addTokenHeader(request, token)))
        );
    }

    private extractErrorMessage(error: HttpErrorResponse): string {
        // For authentication endpoints, handle specific error cases
        if (error.url && error.url.includes('/authenticate')) {
            console.log('JWT Interceptor handling authentication error for URL:', error.url);
            console.log('Authentication error details:', {
                status: error.status,
                statusText: error.statusText,
                url: error.url,
                hasErrorObj: !!error.error,
                errorType: error.error ? typeof error.error : 'undefined',
                errorContent: error.error
            });
            
            // Use the exact backend error message if available
            if (error.error && typeof error.error === 'object' && error.error.message) {
                console.log('JWT Interceptor using exact backend message:', error.error.message);
                return error.error.message;
            }
            
            // Handle 401 status code with a consistent message
            if (error.status === 401) {
                console.log('JWT Interceptor handling 401 status');
                return 'Authentication failed';
            }
            
            // Handle 403 status code with a consistent message
            if (error.status === 403) {
                console.log('JWT Interceptor handling 403 status');
                return 'Your account has an issue. It may be unverified or inactive.';
            }
        }
        
        // Priority 1: Use error.error.message if available (most specific server error)
        if (error.error && error.error.message) {
            console.log('JWT Interceptor using error.error.message:', error.error.message);
            return error.error.message;
        }
        // Priority 2: Check for nested error message
        else if (error.error && error.error.error && error.error.error.message) {
            console.log('JWT Interceptor using error.error.error.message:', error.error.error.message);
            return error.error.error.message;
        }
        // Priority 3: If error.error is a string, use it directly
        else if (error.error && typeof error.error === 'string') {
            console.log('JWT Interceptor using error.error as string:', error.error);
            return error.error;
        }
        // Priority 4: Use error.message if available and not generic
        else if (error.message && error.message !== 'Http failure response') {
            console.log('JWT Interceptor using error.message:', error.message);
            return error.message;
        }
        // Priority 5: Use statusText if available
        else if (error.statusText) {
            console.log('JWT Interceptor using statusText:', error.statusText);
            return error.statusText;
        }
        
        // Fallback
        console.log('JWT Interceptor using fallback error message');
        return 'An error occurred during login. Please try again.';
    }
}