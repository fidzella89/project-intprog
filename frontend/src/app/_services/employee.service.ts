import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, finalize } from 'rxjs/operators';

import { environment } from '@environments/environment';
import { Employee } from '@app/_models';
import { BaseService } from './base.service';
import { AccountService } from './account.service';

@Injectable({ providedIn: 'root' })
export class EmployeeService extends BaseService {
    private employeeSubject: BehaviorSubject<Employee | null>;
    public employee: Observable<Employee | null>;

    constructor(
        private router: Router,
        http: HttpClient,
        accountService: AccountService
    ) {
        super(http, accountService);
        this.employeeSubject = new BehaviorSubject<Employee | null>(null);
        this.employee = this.employeeSubject.asObservable();
    }

    public get employeeValue(): Employee | null {
        return this.employeeSubject.value;
    }

    getAll() {
        return this.createAuthRequest<Employee[]>('GET', 'employees')
            .pipe(map(employees => {
                return employees.map(employee => this.mapDepartmentName(employee));
            }));
    }

    getById(id: string) {
        return this.createAuthRequest<Employee>('GET', `employees/${id}`)
            .pipe(map(employee => this.mapDepartmentName(employee)));
    }

    getByAccountId(accountId: string) {
        return this.createAuthRequest<Employee>('GET', `employees/account/${accountId}`)
            .pipe(map(employee => this.mapDepartmentName(employee)));
    }

    create(employee: Employee) {
        return this.createAuthRequest<Employee>('POST', 'employees', employee)
            .pipe(map(employee => this.mapDepartmentName(employee)));
    }

    update(id: string, params: any) {
        return this.createAuthRequest<Employee>('PUT', `employees/${id}`, params)
            .pipe(map(employee => {
                // Map department name
                employee = this.mapDepartmentName(employee);
                
                // update employee if it's the current employee
                if (employee.id === this.employeeValue?.id) {
                    // publish updated employee to subscribers
                    employee = { ...this.employeeValue, ...employee };
                    this.employeeSubject.next(employee);
                }
                return employee;
            }));
    }

    delete(id: string) {
        return this.createAuthRequest<any>('DELETE', `employees/${id}`)
            .pipe(finalize(() => {
                // auto logout if the logged in employee was deleted
                if (id === this.employeeValue?.id)
                    this.employeeSubject.next(null);
            }));
    }

    private mapDepartmentName(employee: Employee): Employee {
        if (employee && employee.Department && employee.Department.name) {
            return {
                ...employee,
                departmentName: employee.Department.name
            };
        }
        return employee;
    }
} 