import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AccountService } from './account.service';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BaseService {
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
    const account = this.accountService.accountValue;
    
    // If not authenticated, try to refresh token first
    if (!account?.jwtToken) {
      return this.accountService.refreshToken().pipe(
        switchMap(() => this.executeRequest<T>(method, endpoint, body, options)),
        catchError(error => {
          console.error('Authentication error in base service:', error);
          return throwError(() => 'Authentication required. Please log in.');
        })
      );
    }
    
    // Otherwise execute the request directly
    return this.executeRequest<T>(method, endpoint, body, options);
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
        return throwError(() => 'Invalid HTTP method');
    }
  }
  
  /**
   * Handle HTTP errors
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else if (error.status) {
      // Server-side error
      if (error.error && error.error.message) {
        errorMessage = error.error.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else {
        errorMessage = `Error Code: ${error.status}, Message: ${error.statusText}`;
      }
    }
    
    return throwError(() => errorMessage);
  }
} 