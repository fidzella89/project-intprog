import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '@environments/environment';
import { Request } from '@app/_models';
import { BaseService } from './base.service';
import { AccountService } from './account.service';

const baseUrl = `${environment.apiUrl}/requests`;

@Injectable({ providedIn: 'root' })
export class RequestService extends BaseService {
    constructor(
        http: HttpClient,
        accountService: AccountService
    ) {
        super(http, accountService);
    }

    // Create a new requests
    create(params: any) {
        return this.createAuthRequest<any>('POST', 'requests', params);
    }

    // Get all requests (Admin only)
    getAll() {
        return this.createAuthRequest<any>('GET', 'requests');
    }

    // Get request by ID
    getById(id: string): Observable<Request> {
        return this.createAuthRequest<Request>('GET', `requests/${id}`);
    }

    // Get requests for an employee
    getByEmployeeId(employeeId: string) {
        return this.createAuthRequest<any>('GET', `requests/employee/${employeeId}`);
    }

    // Get requests created by current employee
    getMyRequests() {
        return this.createAuthRequest<Request[]>('GET', 'requests/my-requests');
    }

    // Get assigned requests
    getAssignedRequests() {
        return this.createAuthRequest<any>('GET', 'requests/assigned');
    }

    // Update request
    update(id: string, params: any) {
        return this.createAuthRequest<any>('PUT', `requests/${id}`, params);
    }

    // Delete request (Admin only)
    delete(id: string) {
        return this.createAuthRequest<any>('DELETE', `requests/${id}`);
    }

    // Update request status
    changeStatus(id: string, status: string, notes: string = '') {
        return this.createAuthRequest<any>('PUT', `requests/${id}/status`, { status, notes });
    }
}