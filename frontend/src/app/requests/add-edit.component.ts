import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';

import { RequestService, AlertService, EmployeeService, AccountService } from '@app/_services';
import { Role } from '@app/_models';

@Component({ templateUrl: 'add-edit.component.html' })
export class AddEditComponent implements OnInit {
    form: FormGroup;
    id: string;
    isAddMode: boolean;
    loading = false;
    submitted = false;
    currentEmployeeId: number = null;
    isAdmin = false;

    constructor(
        private formBuilder: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private requestService: RequestService,
        private alertService: AlertService,
        private employeeService: EmployeeService,
        private accountService: AccountService
    ) {
        this.isAdmin = this.accountService.accountValue?.role === Role.Admin;
    }

    ngOnInit() {
        this.id = this.route.snapshot.params['id'];
        this.isAddMode = !this.id;
        
        // Get current employee ID
        this.employeeService.getByAccountId(this.accountService.accountValue.id)
            .pipe(first())
            .subscribe(employee => {
                this.currentEmployeeId = employee?.id ? Number(employee.id) : null;
                this.initializeForm();
            });
    }

    initializeForm() {
        this.form = this.formBuilder.group({
            employeeId: [this.currentEmployeeId, Validators.required],
            type: ['Equipment', Validators.required],
            items: this.formBuilder.array([])
        });

        if (!this.isAddMode) {
            this.requestService.getById(this.id)
                .pipe(first())
                .subscribe(x => {
                    this.form.patchValue(x);
                    x.items?.forEach(item => {
                        this.addItem(item.name, item.quantity);
                    });
                });
        } else {
            // Add default empty item
            this.addItem();
        }
    }

    // convenience getters
    get f() { return this.form.controls; }
    get items() { return this.f.items as FormArray; }

    addItem(name: string = '', quantity: number = 1) {
        const itemForm = this.formBuilder.group({
            name: [name, Validators.required],
            quantity: [quantity, [Validators.required, Validators.min(1)]]
        });

        this.items.push(itemForm);
    }

    removeItem(index: number) {
        this.items.removeAt(index);
    }

    onSubmit() {
        this.submitted = true;

        // reset alerts on submit
        this.alertService.clear();

        // stop here if form is invalid
        if (this.form.invalid) {
            return;
        }

        this.loading = true;
        
        if (this.isAddMode) {
            this.createRequest();
        } else {
            this.updateRequest();
        }
    }

    private createRequest() {
        this.requestService.create(this.form.value)
            .pipe(first())
            .subscribe({
                next: () => {
                    this.alertService.success('Request added successfully', { keepAfterRouteChange: true });
                    this.router.navigate(['../'], { relativeTo: this.route });
                },
                error: error => {
                    this.alertService.error(error);
                    this.loading = false;
                }
            });
    }

    private updateRequest() {
        this.requestService.update(this.id, this.form.value)
            .pipe(first())
            .subscribe({
                next: () => {
                    this.alertService.success('Request updated successfully', { keepAfterRouteChange: true });
                    this.router.navigate(['../../'], { relativeTo: this.route });
                },
                error: error => {
                    this.alertService.error(error);
                    this.loading = false;
                }
            });
    }
} 