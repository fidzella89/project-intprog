import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';

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
        
        if (isLoggedIn && isApiUrl) {
            request = this.addTokenHeader(request, account.jwtToken);
        }

        return next.handle(request).pipe(
            catchError(error => {
                if (error instanceof HttpErrorResponse && error.status === 401) {
                    // handle 401 errors
                    return this.handle401Error(request, next);
                }
                
                return throwError(() => error);
            })
        );
    }

    private addTokenHeader(request: HttpRequest<any>, token: string) {
        return request.clone({
            setHeaders: { Authorization: `Bearer ${token}` }
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
                    
                    // retry the failed request with new token
                    return next.handle(this.addTokenHeader(request, account.jwtToken));
                }),
                catchError(error => {
                    this.isRefreshing = false;
                    this.accountService.logout();
                    return throwError(() => error);
                })
            );
        }

        // wait for new token
        return this.refreshTokenSubject.pipe(
            filter(token => token !== null),
            take(1),
            switchMap(token => next.handle(this.addTokenHeader(request, token)))
        );
    }
}