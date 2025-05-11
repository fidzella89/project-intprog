import { Component, OnInit, OnDestroy } from '@angular/core';
import { AccountService } from '@app/_services';
import { Account } from '@app/_models';
import { Subscription } from 'rxjs';

@Component({ templateUrl: 'home.component.html' })
export class HomeComponent implements OnInit, OnDestroy {
    account?: Account | null;
    private accountSubscription?: Subscription;

    constructor(private accountService: AccountService) {
        // Initialize account
        this.account = this.accountService.accountValue;
    }

    ngOnInit() {
        // Subscribe to account changes
        this.accountSubscription = this.accountService.account.subscribe({
            next: (account) => {
                console.log('Home: Account state changed:', account);
                this.account = account;
            },
            error: (error) => {
                console.error('Home: Error in account subscription:', error);
            }
        });
    }

    ngOnDestroy() {
        // Clean up subscription
        if (this.accountSubscription) {
            this.accountSubscription.unsubscribe();
        }
    }
}