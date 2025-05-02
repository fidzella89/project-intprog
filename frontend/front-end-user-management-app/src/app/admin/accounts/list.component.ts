import { Component, OnInit } from '@angular/core';
import { first } from 'rxjs/operators';
import { AccountService, AlertService } from '@app/_services';
import { Account } from '@app/_models';

@Component({ templateUrl: 'list.component.html' })
export class ListComponent implements OnInit {
    accounts: Account[] = [];

    constructor(
        private accountService: AccountService,
        private alertService: AlertService
    ) { }

    ngOnInit() {
        this.loadAccounts();
    }

    private loadAccounts() {
        this.accountService.getAll()
            .pipe(first())
            .subscribe({
                next: (accounts) => {
                    this.accounts = accounts.map(acc => ({
                        ...acc,
                        isDeleting: false,
                        isUpdating: false
                    }));
                },
                error: (error) => {
                    this.alertService.error('Failed to load accounts');
                    console.error(error);
                }
            });
    }

    toggleStatus(account: Account) {
        account.isUpdating = true;
        this.accountService.updateStatus(account.id, !account.isActive)
            .pipe(first())
            .subscribe({
                next: () => {
                    account.isActive = !account.isActive;
                    this.alertService.success(`User ${account.isActive ? 'activated' : 'deactivated'} successfully`);
                },
                error: (error) => {
                    this.alertService.error('Status update failed');
                    console.error(error);
                }
            }).add(() => account.isUpdating = false);
    }

    deleteAccount(id: string) {
        const account = this.accounts.find(x => x.id === id);
        if (!account) return;

        account.isDeleting = true;
        this.accountService.delete(id)
            .pipe(first())
            .subscribe({
                next: () => {
                    this.accounts = this.accounts.filter(x => x.id !== id);
                    this.alertService.success('Account deleted successfully');
                },
                error: (error) => {
                    this.alertService.error('Delete failed');
                    console.error(error);
                    account.isDeleting = false;
                }
            });
    }
}