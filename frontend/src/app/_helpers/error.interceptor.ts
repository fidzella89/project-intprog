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
                // Don't automatically logout on all 401/403 errors - the JWT interceptor now handles this
                // Only logout if we're specifically in an authenticated context where we should logout
                if ([401, 403].includes(err.status) && 
                    this.accountService.accountValue && 
                    !request.url.includes('/refresh-token') && 
                    !request.url.includes('/authenticate')) {
                    this.accountService.logout();
                }

                // Extract the most meaningful error message
                let errorMessage = 'An unexpected error occurred';
                
                if (err.error) {
                    // Check for specific error status codes in the response body
                    if (err.error.status === 'Inactive') {
                        errorMessage = 'Account is inactive. Please contact administrator.';
                    }
                    else if (err.error.status === 'Unverified') {
                        errorMessage = 'Email is not verified. Please check your email for the verification link or register again to receive a new verification link.';
                    }
                    else if (err.error.code === 'TOKEN_INVALID') {
                        errorMessage = 'Your session has expired. Please log in again.';
                    }
                    else if (err.error.code === 'TOKEN_NOT_FOUND') {
                        errorMessage = 'Invalid authentication token. Please log in again.';
                    }
                    // If there's a specific error message in the response, use it
                    else if (err.error.message) {
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
                
                // Handle specific HTTP status codes with more detailed messages
                if (err.status === 0) {
                    errorMessage = 'Cannot connect to server. Please check your internet connection and try again.';
                }
                else if (err.status === 404) {
                    errorMessage = errorMessage || 'The requested resource could not be found. Please check the URL and try again.';
                } 
                else if (err.status === 400) {
                    errorMessage = errorMessage || 'The request was invalid or contains incorrect data. Please check your input and try again.';
                } 
                else if (err.status === 401) {
                    errorMessage = errorMessage || 'You need to be logged in to access this resource. Please login and try again.';
                } 
                else if (err.status === 403) {
                    errorMessage = errorMessage || 'You do not have permission to access this resource. Please contact administrator if you believe this is an error.';
                }
                else if (err.status === 500) {
                    errorMessage = errorMessage || 'A server error occurred. Please try again later or contact support.';
                }
                else if (err.status === 429) {
                    errorMessage = errorMessage || 'Too many requests. Please try again later.';
                }

                console.error('HTTP Error:', err);
                return throwError(() => errorMessage);
            })
        );
    }
}