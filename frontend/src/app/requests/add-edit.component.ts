import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';

import { RequestService, AlertService, AccountService, EmployeeService } from '@app/_services';
import { Role, RequestType, RequestStatus } from '@app/_models';

@Component({ templateUrl: 'add-edit.component.html' })
export class AddEditComponent implements OnInit, OnDestroy {
    form!: FormGroup;
    id?: string;
    isAddMode!: boolean;
    loading = false;
    submitted = false;
    items: any[] = [];
    employeeId?: string;
    employeeFullName?: string;
    targetEmployee?: any;
    isAdmin = false;
    deletedItems: any[] = []; // Track items marked for deletion
    originalItems: any[] = []; // Store original items for comparison
    hiddenItems: { [key: number]: boolean } = {}; // Track visually hidden items
    
    // Error handling
    errorMessage: string | null = null;

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
    get itemsForm() { return this.f.items as FormArray; }

    // convenience getter for easy access to form fields
    get f() { return this.form.controls; }

    ngOnInit() {
        this.id = this.route.snapshot.params['id'];
        this.isAddMode = !this.id;
        
        // Check if there's a specific employeeId in the URL query params
        this.route.queryParams.subscribe(params => {
            this.employeeId = params['employeeId'];
            
            // If employee ID is provided, load their details
            if (this.employeeId) {
                this.employeeService.getById(this.employeeId)
                    .pipe(first())
                    .subscribe({
                        next: (employee) => {
                            this.targetEmployee = employee;
                            // Access name properties correctly based on the Employee type
                            if (employee && employee.account) {
                                this.employeeFullName = `${employee.account.firstName} ${employee.account.lastName}`;
                            }
                            this.form.patchValue({
                                employeeId: employee.id
                            });
                        },
                        error: (error) => {
                            console.error('Error loading employee details:', error);
                            this.alertService.error('Failed to load employee details');
                        }
                    });
            }
        });
        
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
                                        const firstName = employee.account.firstName?.charAt(0).toUpperCase() + 
                                                        (employee.account.firstName?.slice(1)?.toLowerCase() || '');
                                        const lastName = employee.account.lastName?.charAt(0).toUpperCase() + 
                                                       (employee.account.lastName?.slice(1)?.toLowerCase() || '');
                                        this.employeeFullName = `${firstName} ${lastName}`;
                                    }
                                });
                        }
                        
                        // Set the type first
                        this.form.patchValue({ type: request.type });
                        
                        // Clear existing items
                        while (this.itemsForm.length) {
                            this.itemsForm.removeAt(0);
                        }
                        
                        // Load items if any and if not a Leave request
                        if (request.type !== 'Leave' && request.items && request.items.length > 0) {
                            request.items.forEach(item => {
                                this.itemsForm.push(this.formBuilder.group({
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

        this.itemsForm.push(itemForm);
    }

    // Remove item
    removeItem(index: number) {
        const item = this.itemsForm.at(index).value;
        if (item.id) {
            // If item has an ID, it exists in the database
            this.deletedItems.push(item.id);
            this.hiddenItems[index] = true;
        } else {
            // If no ID, it's a new item that can be removed directly
            this.itemsForm.removeAt(index);
        }
    }

    // Restore a previously hidden item
    restoreItem(index: number) {
        this.hiddenItems[index] = false;
        
        // If the item ID was in deletedItems, remove it
        const item = this.itemsForm.at(index).value;
        if (item.id) {
            const idIndex = this.deletedItems.indexOf(item.id);
            if (idIndex !== -1) {
                this.deletedItems.splice(idIndex, 1);
            }
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

        this.loading = true;

        // Get visible items only
        const visibleItems = this.itemsForm.controls
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
            employeeId: this.employeeId || this.form.value.employeeId,
            items: visibleItems,
            isAdmin: this.accountService.accountValue?.role === Role.Admin
        };

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
                    console.error('Error creating request:', error);
                    
                    // Log detailed error information for debugging
                    if (error && error.error) {
                        console.error('Detailed error:', error.error);
                        if (error.error.originalError) {
                            console.error('Original error:', error.error.originalError);
                        }
                        if (error.error.stack) {
                            console.error('Stack trace:', error.error.stack);
                        }
                    }
                    
                    // Handle specific error messages
                    if (typeof error === 'string') {
                        this.errorMessage = error;
                    } else if (error && error.error && error.error.message) {
                        if (error.error.message.includes('Employee') && error.error.message.includes('does not exist')) {
                            this.errorMessage = 'The specified employee does not exist. Please check the employee ID.';
                        } else if (error.error.message.includes('Foreign key constraint')) {
                            this.errorMessage = 'Invalid employee ID or reference.';
                        } else {
                            this.errorMessage = error.error.message;
                        }
                    } else {
                        this.errorMessage = 'Failed to create request. Please try again.';
                    }
                    
                    // Auto-clear error message after 5 seconds
                    setTimeout(() => this.clearError(), 5000);
                    
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
                    console.error('Error updating request:', error);
                    
                    // Log detailed error information for debugging
                    if (error && error.error) {
                        console.error('Detailed error:', error.error);
                        if (error.error.originalError) {
                            console.error('Original error:', error.error.originalError);
                        }
                        if (error.error.stack) {
                            console.error('Stack trace:', error.error.stack);
                        }
                    }
                    
                    // Handle specific error messages
                    if (typeof error === 'string') {
                        this.errorMessage = error;
                    } else if (error && error.error && error.error.message) {
                        if (error.error.message.includes('Employee') && error.error.message.includes('does not exist')) {
                            this.errorMessage = 'The specified employee does not exist. Please check the employee ID.';
                        } else if (error.error.message.includes('Foreign key constraint')) {
                            this.errorMessage = 'Invalid employee ID or reference.';
                        } else {
                            this.errorMessage = error.error.message;
                        }
                    } else {
                        this.errorMessage = 'Failed to update request. Please try again.';
                    }
                    
                    // Auto-clear error message after 5 seconds
                    setTimeout(() => this.clearError(), 5000);
                    
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

    // Method to clear error messages
    clearError() {
        this.errorMessage = null;
    }

    ngOnDestroy() {
        // Cleanup code if needed
    }
} 