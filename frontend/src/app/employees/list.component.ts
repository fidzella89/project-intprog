import { Component, OnInit } from '@angular/core';
import { first } from 'rxjs/operators';

import { AccountService, EmployeeService } from '@app/_services';

@Component({ templateUrl: 'list.component.html' })
export class ListComponent implements OnInit {
    employees = null;

    constructor(
        private accountService: AccountService,
        private employeeService: EmployeeService
    ) {}

    ngOnInit() {
        this.employeeService.getAll()
            .pipe(first())
            .subscribe(employees => this.employees = employees);
    }

    deleteEmployee(id: string) {
        const employee = this.employees.find(x => x.id === id);
        employee.isDeleting = true;
        this.employeeService.delete(id)
            .pipe(first())
            .subscribe(() => {
                this.employees = this.employees.filter(x => x.id !== id);
            });
    }
} 