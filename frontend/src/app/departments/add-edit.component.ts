import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';

import { DepartmentService, AlertService } from '@app/_services';

@Component({ 
    templateUrl: 'add-edit.component.html',
    styles: [`
        .modal-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 1040;
        }
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1050;
            overflow: auto;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .modal-dialog {
            width: 100%;
            max-width: 500px;
            margin: 1.75rem auto;
            position: relative;
        }
        .modal-content {
            position: relative;
            background-color: #fff;
            border-radius: 0.3rem;
            box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.5);
        }
        .modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 1rem;
            background-color: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
            border-top-left-radius: 0.3rem;
            border-top-right-radius: 0.3rem;
        }
        .modal-body {
            padding: 1rem;
        }
        .modal-footer {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            padding: 1rem;
            border-top: 1px solid #e9ecef;
        }
        .btn-close {
            background: transparent;
            border: 0;
            font-size: 1.5rem;
            font-weight: 700;
            color: #000;
            opacity: 0.5;
            cursor: pointer;
        }
        .show {
            display: flex !important;
        }
        .hide {
            display: none !important;
        }
    `]
})
export class AddEditComponent implements OnInit {
    form: FormGroup;
    id: string;
    isAddMode: boolean;
    loading = false;
    submitted = false;
    showConfirmModal = false;
    originalDepartment = null;

    constructor(
        private formBuilder: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private departmentService: DepartmentService,
        private alertService: AlertService
    ) {}

    ngOnInit() {
        this.id = this.route.snapshot.params['id'];
        this.isAddMode = !this.id;
        
        this.form = this.formBuilder.group({
            name: ['', Validators.required],
            description: ['', Validators.required]
        });

        if (!this.isAddMode) {
            this.departmentService.getById(this.id)
                .pipe(first())
                .subscribe(x => {
                    this.originalDepartment = x;
                    this.form.patchValue(x);
                });
        }
    }

    // convenience getter for easy access to form fields
    get f() { return this.form.controls; }

    onSubmit() {
        this.submitted = true;

        // reset alerts on submit
        this.alertService.clear();

        // stop here if form is invalid
        if (this.form.invalid) {
            return;
        }

        if (this.isAddMode) {
            // No confirmation needed for adding new departments
            this.loading = true;
            this.createDepartment();
        } else {
            // Show confirmation for editing existing departments
            this.openConfirmModal();
        }
    }

    openConfirmModal() {
        this.showConfirmModal = true;
        document.body.classList.add('modal-open');
    }

    closeConfirmModal() {
        this.showConfirmModal = false;
        document.body.classList.remove('modal-open');
    }

    confirmSave() {
        this.loading = true;
        this.closeConfirmModal();
        this.updateDepartment();
    }

    private createDepartment() {
        this.departmentService.create(this.form.value)
            .pipe(first())
            .subscribe({
                next: () => {
                    this.alertService.success('Department added successfully', { keepAfterRouteChange: true });
                    this.router.navigate(['/departments']);
                },
                error: error => {
                    this.alertService.error(error);
                    this.loading = false;
                }
            });
    }

    private updateDepartment() {
        this.departmentService.update(this.id, this.form.value)
            .pipe(first())
            .subscribe({
                next: () => {
                    this.alertService.success('Update successful', { keepAfterRouteChange: true });
                    this.router.navigate(['/departments']);
                },
                error: error => {
                    this.alertService.error(error);
                    this.loading = false;
                }
            });
    }
} 