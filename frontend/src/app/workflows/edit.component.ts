import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';

import { WorkflowService, AlertService } from '@app/_services';

@Component({ templateUrl: 'edit.component.html' })
export class EditComponent implements OnInit {
    id: string;
    form: FormGroup;
    loading = false;
    submitted = false;

    constructor(
        private formBuilder: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private workflowService: WorkflowService,
        private alertService: AlertService
    ) {}

    ngOnInit() {
        this.id = this.route.snapshot.params['id'];

        this.form = this.formBuilder.group({
            step: ['', Validators.required],
            status: ['', Validators.required],
            notes: ['']
        });

        this.workflowService.getById(this.id)
            .pipe(first())
            .subscribe(workflow => {
                this.form.patchValue({
                    step: workflow.step,
                    status: workflow.status,
                    notes: workflow.notes
                });
            });
    }

    get f() { return this.form.controls; }

    onSubmit() {
        this.submitted = true;

        this.alertService.clear();

        if (this.form.invalid) {
            return;
        }

        this.loading = true;
        this.workflowService.update(this.id, this.form.value)
            .pipe(first())
            .subscribe({
                next: () => {
                    this.alertService.success('Workflow updated successfully');
                    this.router.navigate(['/workflows/view', this.id]);
                },
                error: error => {
                    this.alertService.error(error);
                    this.loading = false;
                }
            });
    }
} 