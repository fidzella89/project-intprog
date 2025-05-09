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
    deletedItems: any[] = []; // Track items marked for deletion
    originalItems: any[] = []; // Store original items for comparison

    // Getter for checking if items section should be shown
    get showItemsSection(): boolean {
        const type = this.form?.get('type')?.value;
        return type === 'Equipment' || type === 'Resources';
    }

    constructor(
        private formBuilder: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private requestService: RequestService,
        private alertService: AlertService,
        private accountService: AccountService
    ) {
        this.isAdmin = this.accountService.isAdmin;
        this.employeeId = this.accountService.userValue?.id;
    }

    // convenience getter for easy access to form fields
    get f() { return this.form.controls; }

    // getter for items FormArray
    get items() { return this.f.items as FormArray; }

    ngOnInit() {
        this.id = this.route.snapshot.params['id'];
        this.isAddMode = !this.id;

        // Create base form
        this.form = this.formBuilder.group({
            type: ['', Validators.required],
            description: ['', Validators.required],
            items: this.formBuilder.array([])
        });

        if (!this.isAddMode) {
            this.requestService.getById(this.id)
                .pipe(first())
                .subscribe(x => {
                    this.form.patchValue({
                        type: x.type,
                        description: x.description
                    });
                    
                    // Store original items and load them into form
                    if (x.items) {
                        this.originalItems = [...x.items];
                        x.items.forEach(item => this.addItem(item));
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

    // Remove item from form
    removeItem(index: number) {
        const item = this.items.at(index).value;
        if (item.id) {
            // If item has an ID, it exists in database - mark for deletion
            this.deletedItems.push(item);
        }
        this.items.removeAt(index);
    }

    private prepareItemsForSubmission() {
        const formItems = this.items.value;
        const itemsToAdd: any[] = [];
        const itemsToUpdate: any[] = [];

        formItems.forEach((item: any) => {
            if (!item.id) {
                // New item
                itemsToAdd.push(item);
            } else {
                // Existing item - check if modified
                const originalItem = this.originalItems.find(oi => oi.id === item.id);
                if (originalItem && (originalItem.name !== item.name || originalItem.quantity !== item.quantity)) {
                    itemsToUpdate.push(item);
                }
            }
        });

        // Filter out deleted items that match new items
        const itemsToDelete = this.deletedItems.filter(deletedItem => {
            return !itemsToAdd.some(newItem => 
                newItem.name === deletedItem.name && 
                newItem.quantity === deletedItem.quantity
            );
        });

        return {
            itemsToAdd,
            itemsToUpdate,
            itemsToDelete
        };
    }

    onSubmit() {
        this.submitted = true;
        this.alertService.clear();

        // stop here if form is invalid
        if (this.form.invalid) {
            return;
        }

        if (!this.employeeId) {
            this.alertService.error('Employee ID is required');
            return;
        }

        this.loading = true;

        const { itemsToAdd, itemsToUpdate, itemsToDelete } = this.prepareItemsForSubmission();
        
        const requestData = {
            ...this.form.value,
            employeeId: Number(this.employeeId),
            itemChanges: {
                add: itemsToAdd,
                update: itemsToUpdate,
                delete: itemsToDelete.map(item => item.id)
            }
        };

        if (this.isAddMode) {
            this.requestService.create(requestData)
                .pipe(first())
                .subscribe({
                    next: () => {
                        this.alertService.success('Request added successfully');
                        this.router.navigate(['../'], { relativeTo: this.route });
                    },
                    error: error => {
                        this.alertService.error(error);
                        this.loading = false;
                    }
                });
        } else {
            this.requestService.update(this.id, requestData)
                .pipe(first())
                .subscribe({
                    next: () => {
                        this.alertService.success('Request updated successfully');
                        this.router.navigate(['/requests']);
                    },
                    error: error => {
                        this.alertService.error(error);
                        this.loading = false;
                    }
                });
        }
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