import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { first } from 'rxjs/operators';

import { WorkflowService, AlertService, EmployeeService } from '@app/_services';
import { Workflow, Employee } from '@app/_models';

@Component({ templateUrl: 'list.component.html' })
export class ListComponent implements OnInit {
    workflows: Workflow[] = [];
    loading = false;
    employeeId: string | null = null;
    employee: Employee | null = null;

    constructor(
        private workflowService: WorkflowService,
        private employeeService: EmployeeService,
        private alertService: AlertService,
        private route: ActivatedRoute
    ) {}

    ngOnInit() {
        this.route.queryParams.subscribe(params => {
            this.employeeId = params['employeeId'];
            if (this.employeeId) {
                this.loadEmployee();
            }
            this.loadWorkflows();
        });
    }

    private loadEmployee() {
        this.employeeService.getById(this.employeeId!)
            .pipe(first())
            .subscribe({
                next: employee => {
                    this.employee = employee;
                },
                error: error => {
                    this.alertService.error(error);
                }
            });
    }

    private loadWorkflows() {
        this.loading = true;
        const request = this.employeeId ? 
            this.workflowService.getByEmployeeId(this.employeeId) :
            this.workflowService.getAll();

        request.pipe(first())
            .subscribe({
                next: workflows => {
                    this.workflows = workflows;
                    this.loading = false;
                },
                error: error => {
                    this.alertService.error(error);
                    this.loading = false;
                }
            });
    }

    getEmployeeFullName(): string {
        if (!this.employee?.account) return '';
        return `${this.employee.account.firstName} ${this.employee.account.lastName}`.toUpperCase();
    }
} 