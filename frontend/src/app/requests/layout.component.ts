import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { first } from 'rxjs/operators';

import { AccountService, EmployeeService } from '@app/_services';
import { Employee } from '@app/_models';

@Component({
    templateUrl: 'layout.component.html'
})
export class LayoutComponent implements OnInit {
    employeeId: string | null = null;
    employee: Employee | null = null;

    constructor(
        private employeeService: EmployeeService,
        private route: ActivatedRoute
    ) {}

    ngOnInit() {
        this.route.queryParams.subscribe(params => {
            this.employeeId = params['employeeId'];
            if (this.employeeId) {
                this.loadEmployee();
            }
        });
    }

    private loadEmployee() {
        this.employeeService.getById(this.employeeId!)
            .pipe(first())
            .subscribe(employee => {
                this.employee = employee;
            });
    }

    getEmployeeFullName(): string {
        if (!this.employee?.account) return '';
        return `${this.employee.account.firstName} ${this.employee.account.lastName}`.toUpperCase();
    }
} 