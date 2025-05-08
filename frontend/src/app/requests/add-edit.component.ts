import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';

import { RequestService, AlertService, AccountService } from '@app/_services';
import { Role, RequestType, RequestStatus } from '@app/_models';

@Component({ templateUrl: 'add-edit.component.html' })
export class AddEditComponent implements OnInit {
    form: FormGroup;
    id: string;
    isAddMode: boolean;
    loading = false;
    submitted = false;
    employeeId: string | null = null;
    isAdmin = false;
    requestTypes = Object.values(RequestType);

    constructor(
        private formBuilder: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private requestService: RequestService,
        private alertService: AlertService,
        private accountService: AccountService
    ) {
        this.isAdmin = this.accountService.accountValue?.role === Role.Admin;
        
        // Get employeeId from query params
        this.route.queryParams.subscribe(params => {
            this.employeeId = params['employeeId'];
        });
        
        // Initialize the form immediately
        this.form = this.formBuilder.group({
            title: ['', Validators.required],
            description: ['', Validators.required],
            type: ['', Validators.required],
            status: [{ value: RequestStatus.Draft, disabled: false }],
            items: this.formBuilder.array([]),
            currentStep: [{ value: 1, disabled: true }],
            totalSteps: [{ value: 3, disabled: true }]
        });
    }

    ngOnInit() {
        this.id = this.route.snapshot.params['id'];
        this.isAddMode = !this.id;

        if (!this.isAddMode) {
            this.requestService.getById(this.id)
                .pipe(first())
                .subscribe(x => {
                    this.form.patchValue(x);
                    
                    // Load items
                    x.items?.forEach(item => {
                        this.addItem(item);
                    });
                });
        }
    }

    // convenience getter for easy access to form fields
    get f() { return this.form.controls; }
    
    get items() { return this.form.get('items') as FormArray; }

    addItem(item: any = null) {
        const itemForm = this.formBuilder.group({
            id: [item?.id || null],
            name: [item?.name || '', Validators.required],
            quantity: [item?.quantity || null, [Validators.required, Validators.min(1)]],
            status: [{ value: item?.status || RequestStatus.Draft, disabled: !this.isAddMode }]
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

        // Get the form value and add employeeId
        const formValue = this.form.value;
        formValue.employeeId = this.employeeId;

        if (this.isAddMode) {
            this.createRequest(formValue);
        } else {
            this.updateRequest(formValue);
        }
    }

    private createRequest(formValue: any) {
        this.requestService.create(formValue)
            .pipe(first())
            .subscribe({
                next: () => {
                    this.alertService.success('Request created successfully', { keepAfterRouteChange: true });
                    this.router.navigate(['../'], { relativeTo: this.route });
                },
                error: error => {
                    this.alertService.error(error);
                    this.loading = false;
                }
            });
    }

    private updateRequest(formValue: any) {
        this.requestService.update(this.id, formValue)
            .pipe(first())
            .subscribe({
                next: () => {
                    this.alertService.success('Update successful', { keepAfterRouteChange: true });
                    this.router.navigate(['../../'], { relativeTo: this.route });
                },
                error: error => {
                    this.alertService.error(error);
                    this.loading = false;
                }
            });
    }

    submitRequest() {
        this.requestService.changeStatus(this.id, 'Submitted', 'Request submitted by employee')
            .pipe(first())
            .subscribe({
                next: () => {
                    this.alertService.success('Request submitted successfully', { keepAfterRouteChange: true });
                    this.router.navigate(['../../'], { relativeTo: this.route });
                },
                error: error => {
                    this.alertService.error(error);
                    this.loading = false;
                }
            });
    }
} 