import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { first } from 'rxjs/operators';

import { WorkflowService, AlertService } from '@app/_services';
import { Workflow } from '@app/_models';

@Component({ templateUrl: 'view.component.html' })
export class ViewComponent implements OnInit {
    id: string;
    workflow: Workflow;
    loading = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private workflowService: WorkflowService,
        private alertService: AlertService
    ) {}

    ngOnInit() {
        this.id = this.route.snapshot.params['id'];
        this.loadWorkflow();
    }

    private loadWorkflow() {
        this.loading = true;
        this.workflowService.getById(this.id)
            .pipe(first())
            .subscribe({
                next: workflow => {
                    this.workflow = workflow;
                    this.loading = false;
                },
                error: error => {
                    this.alertService.error(error);
                    this.loading = false;
                    this.router.navigate(['/workflows']);
                }
            });
    }
} 