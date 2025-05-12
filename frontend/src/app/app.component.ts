import { Component, OnInit, OnDestroy, TemplateRef } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { AccountService, AlertService } from './_services';
import { Account, Role } from './_models';
import { Subscription, filter } from 'rxjs';
import { first } from 'rxjs/operators';

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
    private lastActiveUrl: string | null = null;

    constructor(
        private accountService: AccountService,
        private router: Router,
        private alertService: AlertService,
        private activatedRoute: ActivatedRoute
    ) {
        // Initialize account from service
        this.account = this.accountService.accountValue;
        console.log('App: Initial account state:', this.account);
    }

    ngOnInit() {
        // Subscribe to account state changes
        this.accountService.account.subscribe(account => {
            this.account = account;
        });

        // On initial load, redirect to home page if already logged in
        if (this.accountService.accountValue) {
            // Redirect to home or previous page
            const returnUrl = this.activatedRoute.snapshot.queryParams['returnUrl'] || this.lastActiveUrl || '/';
        }

        // Subscribe to navigation events to track the last active page
        this.router.events
            .pipe(filter(event => event instanceof NavigationEnd))
            .subscribe((event: NavigationEnd) => {
                // Only store non-login pages
                if (!event.url.includes('/account/login')) {
                    // Store the last active URL in sessionStorage for persistence
                    sessionStorage.setItem('lastActiveUrl', event.url);
                    this.lastActiveUrl = event.url;
                }

                // Redirect to home/dashboard if trying to access login page while logged in
                if (event.url.includes('/account/login') && this.accountService.accountValue) {
                    const returnUrl = this.activatedRoute.snapshot.queryParams['returnUrl'] || this.lastActiveUrl || '/';
                    this.router.navigate([returnUrl]);
                    return;
                }

                // Redirect to login if trying to access protected pages while logged out
                if (!event.url.includes('/account/login') && !this.accountService.accountValue) {
                    this.router.navigate(['/account/login'], { queryParams: { returnUrl: event.url }});
                    return;
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
        this.accountService.logout()
            .pipe(first())
            .subscribe({
                next: () => {
                    // Close the modal
                    this.closeLogoutModal();
                    
                    // Store the current URL before logout to remember where to return
                    const lastUrl = this.lastActiveUrl || '/';
                    sessionStorage.setItem('lastActiveUrl', lastUrl);
                    
                    // The navigation is handled in the account service
                },
                error: error => {
                    // Close the modal even on error
                    this.closeLogoutModal();
                    
                    // Log the error but don't show it to the user
                    console.error('Logout error:', error);
                    
                    // Don't display any error messages as we've already logged out on the client side
                },
                complete: () => {
                    // Make sure modal is closed
                    this.closeLogoutModal();
                }
            });
    }
}