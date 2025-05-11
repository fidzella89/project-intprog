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
                    errorMessage = err.error.message;
                }
                // Priority 2: If error.error is a string, use it directly
                else if (err.error && typeof err.error === 'string') {
                    errorMessage = err.error;
                }
                // Priority 3: Use error.message if available
                else if (err.message) {
                    errorMessage = err.message;
                }
                // Priority 4: Use statusText if available
                else if (err.statusText) {
                    errorMessage = err.statusText;
                }
                
                console.error('HTTP Error:', err);
                return throwError(() => errorMessage);
            })
        );
    }
}