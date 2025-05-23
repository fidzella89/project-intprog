import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { first } from 'rxjs/operators';

import { WorkflowService, AlertService, AccountService, EmployeeService } from '@app/_services';
import { Role, Workflow } from '@app/_models';

@Component({ templateUrl: 'view.component.html' })
export class ViewWorkflowComponent implements OnInit {
    workflow!: Workflow;
    loading = false;
    isAdmin = false;
    isOwner = false;
    employee: any = null;
    employeeId: string | null = null;
    displayEmployeeId: string | null = null;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private workflowService: WorkflowService,
        private employeeService: EmployeeService,
        private alertService: AlertService,
        private accountService: AccountService
    ) {
        this.isAdmin = this.accountService.accountValue?.role === Role.Admin;
    }

    ngOnInit() {
        this.route.queryParams.subscribe(params => {
            this.employeeId = params['employeeId'];
        });

        const id = this.route.snapshot.params['id'];
        this.loadWorkflow(id);
    }

    private loadWorkflow(id: string) {
        this.loading = true;
        this.workflowService.getById(id)
            .pipe(first())
            .subscribe({
                next: workflow => {
                    this.workflow = workflow;
                    if (workflow.employee && workflow.employee.account) {
                        this.employee = workflow.employee;
                        // Don't add EMP prefix if it already exists
                        const empId = workflow.employee.employeeId || '';
                        this.displayEmployeeId = empId;
                        
                        // Check if current user is the owner of the workflow
                        const currentUserId = this.accountService.accountValue?.id;
                        // Convert both values to string for comparison
                        this.isOwner = !!this.isAdmin || 
                            !!(currentUserId && workflow.employee.id && String(workflow.employee.id) === String(currentUserId));
                    }
                    this.loading = false;
                },
                error: error => {
                    this.alertService.error(error);
                    this.loading = false;
                    this.router.navigate(['../'], { 
                        relativeTo: this.route,
                        queryParams: { employeeId: this.employeeId },
                        queryParamsHandling: 'merge'
                    });
                }
            });
    }

    capitalizeFirstLetter(text: string): string {
        if (!text) return '';
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    }

    deleteWorkflow() {
        if (confirm('Are you sure you want to delete this workflow?')) {
            this.loading = true;
            if (this.workflow.id) {
                this.workflowService.delete(this.workflow.id)
                    .pipe(first())
                    .subscribe({
                        next: () => {
                            this.alertService.success('Workflow deleted successfully');
                            const empId = this.employeeId || '';
                            this.router.navigate(['../'], { 
                                relativeTo: this.route,
                                queryParams: { employeeId: empId },
                                queryParamsHandling: 'merge'
                            });
                        },
                        error: error => {
                            this.alertService.error(error);
                            this.loading = false;
                        }
                    });
            } else {
                this.alertService.error('Workflow ID not found');
                this.loading = false;
            }
        }
    }

    // Helper method to determine query params for the Back to List button
    getBackToListQueryParams() {
        // If user is not an admin, always show their own workflows
        if (!this.isAdmin) {
            const currentUserId = this.accountService.accountValue?.id;
            return currentUserId ? { employeeId: currentUserId } : {};
        }
        
        // For admins viewing someone else's workflow
        if (this.workflow?.employee?.id) {
            return { employeeId: this.workflow.employee.id };
        }
        
        // Default case
        return {};
    }
} 