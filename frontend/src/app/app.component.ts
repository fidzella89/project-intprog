import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AccountService } from './_services';
import { Account, Role } from './_models';
import { Subscription, filter } from 'rxjs';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
    Role = Role;
    account?: Account | null;
    showLogoutModal = false;
    private accountSubscription?: Subscription;
    private routerSubscription?: Subscription;

    constructor(
        private accountService: AccountService,
        private router: Router
    ) {
        // Initialize account from service
        this.account = this.accountService.accountValue;
        console.log('App: Initial account state:', this.account);
    }

    ngOnInit() {
        // Subscribe to account changes
        this.accountSubscription = this.accountService.account.subscribe({
            next: (account) => {
                console.log('App: Account state changed:', account);
                this.account = account;
                
                // If account exists and we're on the login page, redirect to home
                if (account && this.router.url.includes('/account/login')) {
                    console.log('App: Redirecting to home page');
                    this.router.navigate(['/']);
                }
            },
            error: (error) => {
                console.error('App: Error in account subscription:', error);
            }
        });

        // Subscribe to router events to handle navigation
        this.routerSubscription = this.router.events
            .pipe(filter(event => event instanceof NavigationEnd))
            .subscribe(() => {
                // Check if we should redirect to home when logged in
                if (this.account && this.router.url.includes('/account/login')) {
                    console.log('App: Navigation - Redirecting logged in user from login page');
                    this.router.navigate(['/']);
                }
                
                // Check if we need to redirect to login when not logged in
                if (!this.account && !this.router.url.includes('/account/')) {
                    console.log('App: Navigation - Redirecting non-logged in user to login');
                    this.router.navigate(['/account/login']);
                }
            });
    }

    ngOnDestroy() {
        // Clean up subscriptions
        if (this.accountSubscription) {
            this.accountSubscription.unsubscribe();
        }
        if (this.routerSubscription) {
            this.routerSubscription.unsubscribe();
        }
    }

    openLogoutModal() {
        this.showLogoutModal = true;
    }

    closeLogoutModal() {
        this.showLogoutModal = false;
    }

    logout() {
        this.accountService.clearAccountData();
        this.closeLogoutModal();
    }
}