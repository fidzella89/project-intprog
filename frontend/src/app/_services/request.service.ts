import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '@environments/environment';
import { Request } from '@app/_models';

@Injectable({ providedIn: 'root' })
export class RequestService {
    constructor(private http: HttpClient) { }

    // Create a new request
    create(request: Request) {
        return this.http.post<Request>(`${environment.apiUrl}/requests`, request);
    }

    // Get all requests (Admin only)
    getAll() {
        return this.http.get<Request[]>(`${environment.apiUrl}/requests`);
    }

    // Get request by ID
    getById(id: string) {
        return this.http.get<Request>(`${environment.apiUrl}/requests/${id}`);
    }

    // Get requests for an employee
    getByEmployeeId(employeeId: number) {
        return this.http.get<Request[]>(`${environment.apiUrl}/requests/employee/${employeeId}`);
    }

    // Get requests created by current employee
    getMyRequests() {
        return this.http.get<Request[]>(`${environment.apiUrl}/requests/my-requests`);
    }

    // Update request
    update(id: string, params: any) {
        return this.http.put<Request>(`${environment.apiUrl}/requests/${id}`, params);
    }

    // Delete request (Admin only)
    delete(id: string) {
        return this.http.delete(`${environment.apiUrl}/requests/${id}`);
    }

    // Update request status
    changeStatus(id: string, status: string, comments: string) {
        return this.http.put<Request>(`${environment.apiUrl}/requests/${id}/status`, { status, comments });
    }
}