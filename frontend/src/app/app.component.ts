import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AccountService, AlertService } from './_services';
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
        private router: Router,
        private alertService: AlertService
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
                    console.log('App: Redirecting to home page from login');
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
            .subscribe((event: NavigationEnd) => {
                console.log('App: Navigation event to', event.url);
                
                // Check if we should redirect to home when logged in
                if (this.account && event.url.includes('/account/login')) {
                    console.log('App: Navigation - Redirecting logged in user from login page');
                    this.router.navigate(['/']);
                }
                
                // We only want to check for auth redirect on main pages, not account pages
                if (!event.url.includes('/account/')) {
                    if (!this.account) {
                        console.log('App: Navigation - Not logged in, redirecting to login');
                        this.router.navigate(['/account/login']);
                    } else {
                        console.log('App: Navigation - Logged in, allowing access to', event.url);
                    }
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
        console.log('App: Logging out user');
        this.closeLogoutModal(); // Close modal immediately after user confirms
        
        this.accountService.logout().subscribe({
            next: () => {
                console.log('App: Logout successful');
                this.alertService.success('Logged out successfully');
                this.router.navigate(['/account/login']);
            },
            error: (error) => {
                console.error('App: Logout error:', error);
                // Even if there's an error, still clear local data and redirect
                this.accountService.clearAccountData();
                this.router.navigate(['/account/login']);
            }
        });
    }
}