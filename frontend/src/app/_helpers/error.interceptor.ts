import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AccountService } from '@app/_services';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
    constructor(private accountService: AccountService) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(request).pipe(
            catchError(err => {
                if ([401, 403].includes(err.status) && this.accountService.accountValue) {
                    // auto logout if 401 or 403 response returned from api
                    this.accountService.logout();
                }

                // Extract the most meaningful error message
                let errorMessage = 'An unexpected error occurred';
                
                if (err.error) {
                    // If there's a specific error message in the response, use it
                    if (err.error.message) {
                        errorMessage = err.error.message;
                    } 
                    // If error.error is a string, use it directly
                    else if (typeof err.error === 'string') {
                        errorMessage = err.error;
                    }
                } 
                // If there's a status text, use it
                else if (err.statusText) {
                    errorMessage = err.statusText;
                }
                
                // Handle specific HTTP status codes
                if (err.status === 404) {
                    errorMessage = errorMessage || 'Resource not found';
                } else if (err.status === 400) {
                    errorMessage = errorMessage || 'Bad request';
                } else if (err.status === 401) {
                    errorMessage = errorMessage || 'Unauthorized access';
                } else if (err.status === 403) {
                    errorMessage = errorMessage || 'Access forbidden';
                }

                console.error('HTTP Error:', err);
                return throwError(() => errorMessage);
            })
        );
    }
}