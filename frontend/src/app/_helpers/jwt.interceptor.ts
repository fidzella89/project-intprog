import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap, finalize } from 'rxjs/operators';

import { environment } from '@environments/environment';
import { AccountService } from '@app/_services';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
    private isRefreshing = false;
    private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

    constructor(private accountService: AccountService) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // add auth header with jwt if account is logged in and request is to the api url
        const account = this.accountService.accountValue;
        const isLoggedIn = account?.jwtToken;
        const isApiUrl = request.url.startsWith(environment.apiUrl);
        
        if (isLoggedIn && isApiUrl && !this.isRefreshTokenRequest(request)) {
            request = this.addTokenHeader(request, account.jwtToken);
        }

        return next.handle(request).pipe(
            catchError(error => {
                if (error instanceof HttpErrorResponse && error.status === 401) {
                    // Try to refresh token only if we're not already refreshing
                    // and this is not a refresh token request
                    if (!this.isRefreshing && !this.isRefreshTokenRequest(request)) {
                        return this.handle401Error(request, next);
                    } else if (this.isRefreshTokenRequest(request)) {
                        // If refresh token request fails, logout and redirect
                        this.accountService.logout();
                        return throwError(() => error);
                    }
                } else if (error instanceof HttpErrorResponse && error.status === 403) {
                    // handle 403 forbidden errors
                    this.accountService.logout();
                    return throwError(() => new Error('Access forbidden. Please login again.'));
                }
                return throwError(() => error);
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
                    return next.handle(this.addTokenHeader(request, account.jwtToken));
                }),
                catchError(error => {
                    this.isRefreshing = false;
                    this.accountService.logout();
                    return throwError(() => error);
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