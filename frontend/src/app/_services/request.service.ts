import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '@environments/environment';
import { Request } from '@app/_models';

const baseUrl = `${environment.apiUrl}/requests`;

@Injectable({ providedIn: 'root' })
export class RequestService {
    constructor(private http: HttpClient) { }

    // Create a new request
    create(params: any) {
        // Extract items from itemChanges for new requests
        const requestData = {
            ...params,
            items: params.itemChanges.add // For new requests, we only need the items to add
        };
        delete requestData.itemChanges;
        return this.http.post(baseUrl, requestData);
    }

    // Get all requests (Admin only)
    getAll() {
        return this.http.get(baseUrl);
    }

    // Get request by ID
    getById(id: string): Observable<Request> {
        return this.http.get<Request>(`${baseUrl}/${id}`);
    }

    // Get requests for an employee
    getByEmployeeId(employeeId: string) {
        return this.http.get(`${baseUrl}/employee/${employeeId}`);
    }

    // Get requests created by current employee
    getMyRequests() {
        return this.http.get<Request[]>(`${baseUrl}/my-requests`);
    }

    // Get assigned requests
    getAssignedRequests() {
        return this.http.get(`${baseUrl}/assigned`);
    }

    // Update request
    update(id: string, params: any) {
        // For updates, send the itemChanges object as is
        return this.http.put(`${baseUrl}/${id}`, params);
    }

    // Delete request (Admin only)
    delete(id: string) {
        return this.http.delete(`${baseUrl}/${id}`);
    }

    // Update request status
    changeStatus(id: string, status: string, notes: string = '') {
        return this.http.put(`${baseUrl}/${id}/status`, { status, notes });
    }
}