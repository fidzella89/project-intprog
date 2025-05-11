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
                        // Don't try to refresh token if we're not logged in
                        if (!isLoggedIn) {
                            // Redirect to login page but don't clear data
                            this.router.navigate(['/account/login']);
                            // Pass through the exact error message
                            return throwError(() => error.error?.message || error.message || error);
                        }
                        
                        // Don't refresh if this is already a refresh token request
                        if (this.isRefreshTokenRequest(request)) {
                            // Clear account data and redirect
                            this.accountService.clearAccountData();
                            this.router.navigate(['/account/login']);
                            // Pass through the exact error message
                            return throwError(() => error.error?.message || error.message || error);
                        }
                        
                        // Try to refresh the token
                        return this.handle401Error(request, next);
                    } 
                    // Handle 403 Forbidden errors
                    else if (error.status === 403) {
                        // Only logout if we're already logged in
                        if (isLoggedIn) {
                            this.accountService.clearAccountData();
                            this.router.navigate(['/account/login'], { 
                                queryParams: { returnUrl: this.router.url }
                            });
                        }
                        // Pass through the exact error message
                        return throwError(() => error.error?.message || error.message || error);
                    }
                    // Handle other common errors with specific messages
                    else if (error.status === 404) {
                        return throwError(() => error.error?.message || error.message || error);
                    }
                    else if (error.status === 500) {
                        return throwError(() => error.error?.message || error.message || error);
                    }
                    else if (error.status === 0) {
                        return throwError(() => error.error?.message || error.message || error);
                    }
                }
                return throwError(() => error.error?.message || error.message || error);
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
                    // Only logout if refresh token fails with auth errors
                    if (error.status === 401 || error.status === 403) {
                        this.accountService.clearAccountData();
                        this.router.navigate(['/account/login']);
                    }
                    // Pass through the exact error message
                    return throwError(() => error.error?.message || error.message || error);
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
}