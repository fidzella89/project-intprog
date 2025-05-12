import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, switchMap, delay, retry } from 'rxjs/operators';
import { AccountService } from './account.service';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BaseService {
  // Track the last refresh attempt time to prevent multiple simultaneous refresh attempts
  private static lastRefreshAttempt = 0;
  private static isRefreshing = false;
  
  constructor(
    protected http: HttpClient,
    protected accountService: AccountService
  ) { }

  /**
   * Creates an HTTP request with authentication headers and error handling
   * @param method HTTP method (GET, POST, PUT, DELETE)
   * @param endpoint API endpoint without base URL
   * @param body Request body (optional)
   * @param options HTTP options (optional)
   * @returns Observable of the API response
   */
  protected createAuthRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: any,
    options?: {
      headers?: HttpHeaders;
      params?: any;
      responseType?: any;
    }
  ): Observable<T> {
    // Get the current account to check for authentication
    let account = this.accountService.accountValue;
    
    // If no account in memory, check sessionStorage
    if (!account?.jwtToken) {
      try {
        const storedAccount = sessionStorage.getItem('account');
        if (storedAccount) {
          account = JSON.parse(storedAccount);
          
          // If we found a valid token in sessionStorage, update the accountSubject
          if (account?.jwtToken) {
            this.accountService.updateStoredAccount(account);
          }
        }
      } catch (error) {
        console.error('Error reading stored account:', error);
      }
    }
    
    // If we now have a valid token (either from memory or sessionStorage), use it
    if (account?.jwtToken) {
      return this.executeRequest<T>(method, endpoint, body, options);
    }
    
    // If still not authenticated, try to refresh token
    // Prevent multiple simultaneous refresh attempts
    const now = Date.now();
    if (BaseService.isRefreshing || (now - BaseService.lastRefreshAttempt < 2000)) {
      // Return an observable that retries after a delay to wait for the refresh to complete
      return of(null).pipe(
        delay(1000),
        switchMap(() => this.createAuthRequest<T>(method, endpoint, body, options)),
        retry(3),
        catchError(error => {
          console.error('Still not authenticated after waiting for token refresh:', error);
          return throwError(() => ({ message: 'Please log in to access this resource' }));
        })
      );
    }
    
    BaseService.isRefreshing = true;
    BaseService.lastRefreshAttempt = now;
    
    return this.accountService.refreshToken().pipe(
      switchMap(() => {
        BaseService.isRefreshing = false;
        return this.executeRequest<T>(method, endpoint, body, options);
      }),
      catchError(error => {
        BaseService.isRefreshing = false;
        console.error('Authentication error in base service:', error);
        return throwError(() => ({ message: 'Authentication required. Please log in.' }));
      })
    );
  }
  
  /**
   * Execute the actual HTTP request
   */
  private executeRequest<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: any,
    options?: {
      headers?: HttpHeaders;
      params?: any;
      responseType?: any;
    }
  ): Observable<T> {
    const url = `${environment.apiUrl}/${endpoint}`;
    const httpOptions = {
      headers: options?.headers || new HttpHeaders({
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }),
      params: options?.params,
      responseType: options?.responseType || 'json',
      withCredentials: true
    };
    
    switch (method) {
      case 'GET':
        return this.http.get<T>(url, httpOptions).pipe(
          catchError(this.handleError)
        );
      case 'POST':
        return this.http.post<T>(url, body, httpOptions).pipe(
          catchError(this.handleError)
        );
      case 'PUT':
        return this.http.put<T>(url, body, httpOptions).pipe(
          catchError(this.handleError)
        );
      case 'DELETE':
        return this.http.delete<T>(url, httpOptions).pipe(
          catchError(this.handleError)
        );
      default:
        return throwError(() => ({ message: 'Invalid HTTP method' }));
    }
  }
  
  /**
   * Handle HTTP errors and transform them to a consistent format
   */
  private handleError(error: any): Observable<never> {
    // Ensure we always return an object with a message property rather than a string
    // This prevents raw error messages from being displayed in the UI
    
    let errorObj = { message: 'An unknown error occurred' };
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorObj.message = `Error: ${error.error.message}`;
    } else if (error.status) {
      // Server-side error
      if (error.error && typeof error.error === 'object' && error.error.message) {
        errorObj.message = error.error.message;
      } else if (typeof error.error === 'string') {
        try {
          // Try to parse JSON string errors
          const parsedError = JSON.parse(error.error);
          if (parsedError.message) {
            errorObj.message = parsedError.message;
          }
        } catch {
          // If not valid JSON, use the string directly
          errorObj.message = error.error;
        }
      } else if (error.message) {
        errorObj.message = error.message;
      } else {
        errorObj.message = `Error Code: ${error.status}, Message: ${error.statusText}`;
      }
    }
    
    return throwError(() => errorObj);
  }
} 