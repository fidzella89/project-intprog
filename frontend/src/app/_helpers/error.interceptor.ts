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
                // Log the complete error structure for debugging
                console.error('HTTP Error Details:', {
                    status: err.status,
                    statusText: err.statusText,
                    url: err.url,
                    error: err.error,
                    message: err.message
                });
                
                // Only logout if necessary (401/403 for authenticated requests)
                if ([401, 403].includes(err.status) && 
                    this.accountService.accountValue && 
                    !request.url.includes('/refresh-token') && 
                    !request.url.includes('/authenticate')) {
                    this.accountService.logout();
                }

                // Get the raw error message directly from the server
                let errorMessage = 'An unexpected error occurred';
                
                // Priority 1: Use error.error.message if available (most specific server error)
                if (err.error && err.error.message) {
                    console.log('Using error.error.message:', err.error.message);
                    errorMessage = err.error.message;
                }
                // Priority 2: Check for nested error message
                else if (err.error && err.error.error && err.error.error.message) {
                    console.log('Using error.error.error.message:', err.error.error.message);
                    errorMessage = err.error.error.message;
                }
                // Priority 3: If error.error is a string, use it directly
                else if (err.error && typeof err.error === 'string') {
                    console.log('Using error.error as string:', err.error);
                    errorMessage = err.error;
                }
                // Priority 4: Use error.message if available
                else if (err.message && err.message !== 'Http failure response') {
                    console.log('Using error.message:', err.message);
                    errorMessage = err.message;
                }
                // Priority 5: Use statusText if available
                else if (err.statusText) {
                    console.log('Using statusText:', err.statusText);
                    errorMessage = err.statusText;
                }
                else {
                    console.log('Using default error message');
                }
                
                console.error('Final error message:', errorMessage);
                return throwError(() => errorMessage);
            })
        );
    }
}