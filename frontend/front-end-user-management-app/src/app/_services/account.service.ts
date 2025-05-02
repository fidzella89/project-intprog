import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, finalize } from 'rxjs/operators';

import { environment } from '@environments/environment';
import { Account } from '@app/_models';

const baseUrl = `${environment.apiUrl}/accounts`;


@Injectable({ providedIn: 'root' })
export class AccountService {
    private accountSubject: BehaviorSubject<Account>;
    public account: Observable<Account>;

    constructor(private router: Router, private http: HttpClient) {
        this.accountSubject = new BehaviorSubject<Account>(null);
        this.account = this.accountSubject.asObservable();
    }

    public get accountValue(): Account {
        return this.accountSubject.value;
    }

    login(email: string, password: string) {
        return this.http.post<any>(`${baseUrl}/authenticate`, { email, password }, { withCredentials: true })
            .pipe(map(account => {
                this.accountSubject.next(account)
                this.startRefreshTokenTimer();
                return account;
            }));
    }

    logout() {
        this.http.post<any>(`${baseUrl}/revoke-token`, {}, { withCredentials: true }).subscribe();
        this.stopRefreshTokenTimer();
        this.accountSubject.next(null);
        this.router.navigate(['/account/login']);
    }


    refreshToken() {
        return this.http.post<any>(`${baseUrl}/refresh-token`, {}, { withCredentials: true })
            .pipe(map((account => {
                this.accountSubject.next(account);
                this.startRefreshTokenTimer();
                return account;
            })))
    }

    register(account: Account) {
        return this.http.post(`${baseUrl}/register`, account);
    }

    isFirstUser(): boolean {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        return users.length === 1 && users[0].role === 'Admin' && users[0].isVerified === true;
    }
    

    verifyEmail(token: string) {
        return this.http.post(`${baseUrl}/verify-email`, { token });
    }

    forgotPassword(email: string) {
        return this.http.post(`${baseUrl}/forgot-password`, { email });
    }

    validateResetToken(token: string) {
        return this.http.post(`${baseUrl}/validate-reset-token`, { token });
    }

    resetPassword(token: string, password: string, confirmPassword: string) {
        return this.http.post(`${baseUrl}/reset-password`, { token, password, confirmPassword });
    }

    getAll() {
        return this.http.get<Account[]>(baseUrl);
    }

    updateStatus(id: string, isActive: boolean): Observable<Account> {
        return this.http.patch<Account>(`${baseUrl}/${id}/status`, { isActive })
            .pipe(map(updatedAccount => {
                // Update local account if it's the current user
                if (this.accountValue?.id === id) {
                    const account = { ...this.accountValue, isActive };
                    this.accountSubject.next(account);
                }
                return updatedAccount;
            }));
    }

    getById(id: string) {
        return this.http.get<Account>(`${baseUrl}/${id}`);
    }

    create(params: Omit<Account, 'id' | 'jwtToken'>): Observable<Account> {
        return this.http.post<Account>(baseUrl, params);
    }

    update(id: string, params: Partial<Account>): Observable<Account> {
        return this.http.put<Account>(`${baseUrl}/${id}`, params)
            .pipe(map(account => {
                // Update current account if it was updated
                if (account.id === this.accountValue?.id) {
                    // Publish updated account to subscribers
                    const updatedAccount = { ...this.accountValue, ...account };
                    this.accountSubject.next(updatedAccount);
                }
                return account;
            }));
    }


    delete(id: string) {
        return this.http.delete(`${baseUrl}/${id}`)
            .pipe(finalize(() => {
                // auto logout if the logged in account was deleted
                if (id === this.accountValue.id) {
                    this.logout();
                }
            }));
    }


    // helper methods

    private refreshTokenTimeout;

    private startRefreshTokenTimer() {
        // Check if account value exists and has a jwtToken
        if (!this.accountValue?.jwtToken) {
            console.error('No JWT token available');
            return;
        }

        try {
            // Split the token and decode the payload
            const tokenParts = this.accountValue.jwtToken.split('.');
            if (tokenParts.length !== 3) {
                throw new Error('Invalid JWT token format');
            }

            const payload = JSON.parse(atob(tokenParts[1]));
            const expires = new Date(payload.exp * 1000);

            // Set timeout to refresh token 1 minute before expiration
            const timeout = expires.getTime() - Date.now() - (60 * 1000);
            this.refreshTokenTimeout = setTimeout(() => this.refreshToken().subscribe(), timeout);
        } catch (error) {
            console.error('Error processing JWT token:', error);
            this.stopRefreshTokenTimer();
        }
    }

    private stopRefreshTokenTimer() {
        clearTimeout(this.refreshTokenTimeout);
    }

}
