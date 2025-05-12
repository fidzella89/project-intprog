import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '@environments/environment';
import { Workflow } from '@app/_models';
import { BaseService } from './base.service';
import { AccountService } from './account.service';

@Injectable({ providedIn: 'root' })
export class WorkflowService extends BaseService {
    constructor(
        http: HttpClient,
        accountService: AccountService
    ) {
        super(http, accountService);
    }

    getAll() {
        return this.createAuthRequest<Workflow[]>('GET', 'workflows');
    }

    getById(id: string) {
        return this.createAuthRequest<Workflow>('GET', `workflows/${id}`);
    }

    getByEmployeeId(employeeId: string) {
        return this.createAuthRequest<Workflow[]>('GET', `workflows/employee/${employeeId}`);
    }

    getByRequestId(requestId: string) {
        return this.createAuthRequest<Workflow[]>('GET', `workflows/request/${requestId}`);
    }

    create(workflow: any) {
        return this.createAuthRequest<Workflow>('POST', 'workflows', workflow);
    }

    update(id: string, params: any) {
        return this.createAuthRequest<Workflow>('PUT', `workflows/${id}`, params);
    }

    changeStatus(id: string, status: string, comments: string = '') {
        return this.createAuthRequest<Workflow>('PUT', `workflows/${id}`, { status, comments });
    }

    delete(id: string) {
        return this.createAuthRequest<any>('DELETE', `workflows/${id}`);
    }

    deleteItem(itemId: string) {
        return this.createAuthRequest<any>('DELETE', `workflows/items/${itemId}`);
    }
}