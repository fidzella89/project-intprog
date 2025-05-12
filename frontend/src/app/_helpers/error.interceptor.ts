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
                let errorMessage = this.getErrorMessage(err);
                
                console.error('Final error message:', errorMessage);
                return throwError(() => errorMessage);
            })
        );
    }

    // Function to extract most appropriate error message
    private getErrorMessage(err: any): string {
        if (err.error && typeof err.error === 'object' && err.error.message) {
            return err.error.message;
        } else if (err.error && err.error.error && err.error.error.message) {
            return err.error.error.message;
        } else if (err.error && typeof err.error === 'string') {
            return err.error;
        } else if (err.message) {
            return err.message;
        } else if (err.statusText) {
            return err.statusText;
        } else {
            return 'An unexpected error occurred';
        }
    }
}