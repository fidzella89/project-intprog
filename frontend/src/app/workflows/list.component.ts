import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { first } from 'rxjs/operators';

import { WorkflowService, AlertService, AccountService } from '@app/_services';
import { Role, WorkflowStatus } from '@app/_models';

@Component({ templateUrl: 'list.component.html' })
export class ListWorkflowComponent implements OnInit {
    workflows = null;
    loading = false;
    isAdmin = false;
    employeeId: string | null = null;

    constructor(
        private workflowService: WorkflowService,
        private alertService: AlertService,
        private accountService: AccountService,
        private route: ActivatedRoute
    ) {
        this.isAdmin = this.accountService.accountValue?.role === Role.Admin;
        
        // Get employeeId from query params
        this.route.queryParams.subscribe(params => {
            this.employeeId = params['employeeId'];
            if (this.employeeId) {
                this.loadWorkflows();
            }
        });
    }

    ngOnInit() {
        if (!this.employeeId) {
            this.loadAllWorkflows();
        }
    }

    private loadAllWorkflows() {
        this.loading = true;
        this.workflowService.getAll()
            .pipe(first())
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

    private loadWorkflows() {
        this.loading = true;
        this.workflowService.getByEmployeeId(this.employeeId)
            .pipe(first())
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

    changeStatus(id: string, status: WorkflowStatus) {
        const workflow = this.workflows.find(x => x.id === id);
        if (!workflow) return;

        const comments = prompt('Please enter comments for this status change:');
        if (comments === null) return; // User cancelled

        workflow.isUpdating = true;
        this.workflowService.changeStatus(id, status, comments)
            .pipe(first())
            .subscribe({
                next: () => {
                    workflow.status = status;
                    workflow.isUpdating = false;
                    this.alertService.success('Workflow status updated successfully');
                },
                error: error => {
                    this.alertService.error(error);
                    workflow.isUpdating = false;
                }
            });
    }

    deleteWorkflow(id: string) {
        const workflow = this.workflows.find(x => x.id === id);
        if (!workflow) return;

        if (confirm('Are you sure you want to delete this workflow?')) {
            workflow.isDeleting = true;
            this.workflowService.delete(id)
                .pipe(first())
                .subscribe({
                    next: () => {
                        this.workflows = this.workflows.filter(x => x.id !== id);
                        this.alertService.success('Workflow deleted successfully');
                    },
                    error: error => {
                        this.alertService.error(error);
                        workflow.isDeleting = false;
                    }
                });
        }
    }
} 