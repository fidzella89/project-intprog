import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '@environments/environment';
import { Workflow } from '@app/_models';

@Injectable({ providedIn: 'root' })
export class WorkflowService {
    constructor(private http: HttpClient) { }

    getAll() {
        return this.http.get<Workflow[]>(`${environment.apiUrl}/workflows`);
    }

    getById(id: string) {
        return this.http.get<Workflow>(`${environment.apiUrl}/workflows/${id}`);
    }

    getByEmployeeId(employeeId: string) {
        return this.http.get<Workflow[]>(`${environment.apiUrl}/workflows/employee/${employeeId}`);
    }

    getByRequestId(requestId: string) {
        return this.http.get<Workflow[]>(`${environment.apiUrl}/workflows/request/${requestId}`);
    }

    create(params: any) {
        return this.http.post<Workflow>(`${environment.apiUrl}/workflows`, params);
    }

    update(id: string, params: any) {
        return this.http.put<Workflow>(`${environment.apiUrl}/workflows/${id}`, params);
    }

    delete(id: string) {
        return this.http.delete(`${environment.apiUrl}/workflows/${id}`);
    }
} 