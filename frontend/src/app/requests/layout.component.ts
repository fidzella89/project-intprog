import { Component } from '@angular/core';
import { AccountService } from '@app/_services';
import { Role } from '@app/_models';

@Component({
    templateUrl: 'layout.component.html'
})
export class LayoutComponent {
    Role = Role;
    
    constructor(private accountService: AccountService) {}

    get isAdmin() {
        return this.accountService.accountValue?.role === Role.Admin;
    }

    get isModerator() {
        return this.accountService.accountValue?.role === Role.Moderator;
    }
} 