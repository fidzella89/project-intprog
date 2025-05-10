import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';

import { RequestService, AlertService, AccountService, EmployeeService } from '@app/_services';
import { Role, RequestType, RequestStatus } from '@app/_models';

@Component({ templateUrl: 'add-edit.component.html' })
export class AddEditComponent implements OnInit {
    form: FormGroup;
    id: string;
    isAddMode: boolean;
    loading = false;
    submitted = false;
    employeeId: string | null = null;
    employeeFullName: string | null = null;
    isAdmin = false;
    deletedItems: any[] = []; // Track items marked for deletion
    originalItems: any[] = []; // Store original items for comparison
    hiddenItems: { [key: number]: boolean } = {}; // Track visually hidden items

    constructor(
        private formBuilder: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private requestService: RequestService,
        private alertService: AlertService,
        private accountService: AccountService,
        private employeeService: EmployeeService
    ) {
        this.isAdmin = this.accountService.accountValue?.role === Role.Admin;
    }

    // Getter for checking if items section should be shown
    get showItemsSection(): boolean {
        const type = this.form?.get('type')?.value;
        return type === 'Equipment' || type === 'Resources';
    }

    // getter for items FormArray
    get items() { return this.f.items as FormArray; }

    // convenience getter for easy access to form fields
    get f() { return this.form.controls; }

    ngOnInit() {
        this.id = this.route.snapshot.params['id'];
        this.isAddMode = !this.id;

        // Get employeeId from query params
        const params = this.route.snapshot.queryParams;
        this.employeeId = params['employeeId'];
        console.log('Query params:', params); // Debug log
        console.log('EmployeeId from query params:', this.employeeId); // Debug log

        // If we have an employeeId, load employee details
        if (this.employeeId) {
            this.employeeService.getById(this.employeeId)
                .pipe(first())
                .subscribe({
                    next: (employee) => {
                        console.log('Employee details loaded:', employee); // Debug log
                        if (employee && employee.account) {
                            const firstName = employee.account.firstName.charAt(0).toUpperCase() + employee.account.firstName.slice(1).toLowerCase();
                            const lastName = employee.account.lastName.charAt(0).toUpperCase() + employee.account.lastName.slice(1).toLowerCase();
                            this.employeeFullName = `${firstName} ${lastName}`;
                        }
                    },
                    error: error => {
                        this.alertService.error(error);
                    }
                });
        }

        this.form = this.formBuilder.group({
            type: ['', Validators.required],
            items: this.formBuilder.array([])
        });

        // Watch for type changes to handle item validation and clear items for Leave requests
        this.form.get('type')?.valueChanges.subscribe(type => {
            const itemsArray = this.form.get('items') as FormArray;
            if (type === 'Leave') {
                itemsArray.clear(); // Clear all items for Leave requests
                itemsArray.clearValidators();
            } else {
                itemsArray.setValidators([Validators.required, Validators.minLength(1)]);
            }
            itemsArray.updateValueAndValidity();
        });

        if (!this.isAddMode) {
            this.requestService.getById(this.id)
                .pipe(first())
                .subscribe({
                    next: (request) => {
                        // If editing, use the employeeId from the request
                        this.employeeId = request.employeeId?.toString();
                        
                        // Load employee details if not already loaded
                        if (this.employeeId && !this.employeeFullName) {
                            this.employeeService.getById(this.employeeId)
                                .pipe(first())
                                .subscribe(employee => {
                                    if (employee && employee.account) {
                                        const firstName = employee.account.firstName.charAt(0).toUpperCase() + employee.account.firstName.slice(1).toLowerCase();
                                        const lastName = employee.account.lastName.charAt(0).toUpperCase() + employee.account.lastName.slice(1).toLowerCase();
                                        this.employeeFullName = `${firstName} ${lastName}`;
                                    }
                                });
                        }
                        
                        // Set the type first
                        this.form.patchValue({ type: request.type });
                        
                        // Clear existing items
                        while (this.items.length) {
                            this.items.removeAt(0);
                        }
                        
                        // Load items if any and if not a Leave request
                        if (request.type !== 'Leave' && request.items && request.items.length > 0) {
                            request.items.forEach(item => {
                                this.items.push(this.formBuilder.group({
                                    id: [item.id],
                                    name: [item.name, [Validators.required, Validators.maxLength(100)]],
                                    quantity: [item.quantity, [Validators.required, Validators.min(1), Validators.max(9999)]]
                                }));
                            });
                            this.originalItems = [...request.items];
                        }
                    },
                    error: error => {
                        this.alertService.error(error);
                    }
                });
        }
    }

    // Add item to form
    addItem(item: any = null) {
        const itemForm = this.formBuilder.group({
            id: [item ? item.id : null],
            name: [item ? item.name : '', [Validators.required, Validators.maxLength(100)]],
            quantity: [item ? item.quantity : '', [Validators.required, Validators.min(1), Validators.max(9999)]]
        });

        this.items.push(itemForm);
    }

    // Remove item
    removeItem(index: number) {
        const item = this.items.at(index).value;
        if (item.id) {
            // If item has an ID, it exists in the database
            this.deletedItems.push(item.id);
            this.hiddenItems[index] = true;
        } else {
            // If no ID, it's a new item that can be removed directly
            this.items.removeAt(index);
                }
            }

    // Check if item is hidden
    isItemHidden(index: number): boolean {
        return this.hiddenItems[index] === true;
    }

    onSubmit() {
        this.submitted = true;
        this.alertService.clear();

        // stop here if form is invalid
        if (this.form.invalid) {
            return;
        }

        // Get employeeId from query params
        if (!this.employeeId) {
            const params = this.route.snapshot.queryParams;
            this.employeeId = params['employeeId'];
            console.log('EmployeeId from query params:', this.employeeId); // Debug log
        }

        if (!this.employeeId) {
            this.alertService.error('Employee ID is required');
            return;
        }

        // Validate items if type is not Leave
        if (this.form.value.type !== 'Leave' && this.items.length === 0) {
            this.alertService.error('At least one item is required for Equipment and Resources requests');
            return;
        }

        this.loading = true;

        // Get visible items only
        const visibleItems = this.items.controls
            .filter((_, index) => !this.isItemHidden(index))
            .map(control => {
                const value = control.value;
                // Only include id if it exists (for existing items)
                return {
                    ...(value.id ? { id: value.id } : {}),
                    name: value.name,
                    quantity: value.quantity
                };
            });

        // Prepare request data - use the employeeId directly from query params
        const requestData = {
            type: this.form.value.type,
            employeeId: Number(this.employeeId), // This is now the employee's id, not employeeId
            items: visibleItems,
            isAdmin: this.accountService.accountValue?.role === Role.Admin
        };
        console.log('Request data being sent:', requestData); // Debug log

        if (this.isAddMode) {
            this.createRequest(requestData);
        } else {
            this.updateRequest(requestData);
        }
    }

    private createRequest(requestData: any) {
        this.requestService.create(requestData)
            .pipe(first())
            .subscribe({
                next: () => {
                    this.alertService.success('Request added successfully', { keepAfterRouteChange: true });
                    this.router.navigate(['../'], { 
                        relativeTo: this.route,
                        queryParams: { employeeId: this.employeeId },
                        queryParamsHandling: 'merge'
                    });
                },
                error: error => {
                    this.alertService.error(error);
                    this.loading = false;
                }
            });
    }

    private updateRequest(requestData: any) {
        this.requestService.update(this.id, requestData)
            .pipe(first())
            .subscribe({
                next: () => {
                    this.alertService.success('Request updated successfully', { keepAfterRouteChange: true });
                    this.router.navigate(['../../'], { 
                        relativeTo: this.route,
                        queryParams: { employeeId: this.employeeId },
                        queryParamsHandling: 'merge'
                    });
                },
                error: error => {
                    this.alertService.error(error);
                    this.loading = false;
                }
            });
    }

    onCancel() {
        // Navigate back to the requests list with the employee parameter
        if (this.employeeId) {
            this.router.navigate(['/requests'], { 
                queryParams: { employeeId: this.employeeId },
                queryParamsHandling: 'merge'
            });
        } else {
            this.router.navigate(['/requests']);
        }
    }
} 