import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '@environments/environment';
import { Department } from '@app/_models';
import { BaseService } from './base.service';
import { AccountService } from './account.service';

@Injectable({ providedIn: 'root' })
export class DepartmentService extends BaseService {
    constructor(
        http: HttpClient,
        accountService: AccountService
    ) {
        super(http, accountService);
    }

    getAll() {
        return this.createAuthRequest<Department[]>('GET', 'departments');
    }

    getById(id: string) {
        return this.createAuthRequest<Department>('GET', `departments/${id}`);
    }

    create(department: Department) {
        return this.createAuthRequest<Department>('POST', 'departments', department);
    }

    update(id: string, params: any) {
        return this.createAuthRequest<Department>('PUT', `departments/${id}`, params);
    }

    delete(id: string) {
        return this.createAuthRequest<any>('DELETE', `departments/${id}`);
    }
} 