import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AccountService } from './_services';
import { Account, Role } from './_models';
import { Subscription } from 'rxjs';

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
    }

    ngOnDestroy() {
        // Clean up subscription
        if (this.accountSubscription) {
            this.accountSubscription.unsubscribe();
        }
    }

    openLogoutModal() {
        this.showLogoutModal = true;
    }

    closeLogoutModal() {
        this.showLogoutModal = false;
    }

    logout() {
        this.closeLogoutModal();
        this.accountService.logout().subscribe({
            complete: () => {
                this.router.navigate(['/account/login']);
            },
            error: (error) => {
                console.error('Logout error:', error);
                // Still navigate to login on error
                this.router.navigate(['/account/login']);
            }
        });
    }
}