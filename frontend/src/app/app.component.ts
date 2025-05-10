import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AccountService } from './_services';
import { Account, Role } from './_models';

@Component({
    selector: 'app',
    templateUrl: 'app.component.html'
})
export class AppComponent {
    Role = Role;
    account: Account;
    showLogoutModal = false;

    constructor(
        private accountService: AccountService,
        private router: Router
    ) {
        this.accountService.account.subscribe(x => this.account = x);
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
                this.router.navigate(['/account/login']);
            }
        });
    }
}