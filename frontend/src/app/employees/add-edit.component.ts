import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';

import { AccountService, AlertService, EmployeeService, DepartmentService } from '@app/_services';
import { Employee, Account, Department, Role } from '@app/_models';

@Component({ templateUrl: 'add-edit.component.html' })
export class AddEditComponent implements OnInit {
    form: FormGroup;
    id: string;
    isAddMode: boolean;
    loading = false;
    submitted = false;
    accounts: Account[] = [];
    availableAccounts: Account[] = [];
    departments: Department[] = [];
    selectedAccountName: string = '';
    showDeleteModal = false;
    employeeToDelete: string = null;

    constructor(
        private formBuilder: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private accountService: AccountService,
        private employeeService: EmployeeService,
        private departmentService: DepartmentService,
        private alertService: AlertService
    ) {}

    ngOnInit() {
        this.id = this.route.snapshot.params['id'];
        this.isAddMode = !this.id;
        
        // Load accounts and departments
        this.loadAccounts();
        this.loadDepartments();
        
        this.form = this.formBuilder.group({
            accountId: ['', Validators.required],
            employeeId: [{ value: this.generateEmployeeId(), disabled: true }, Validators.required],
            departmentId: ['', Validators.required],
            position: ['', Validators.required],
            hireDate: ['', Validators.required],
            salary: [''],
            status: ['Active']
        });

        // Watch for account changes to update the name display
        this.form.get('accountId').valueChanges.subscribe(accountId => {
            const account = this.accounts.find(a => a.id === accountId);
            if (account) {
                this.selectedAccountName = `${account.firstName} ${account.lastName}`;
            } else {
                this.selectedAccountName = '';
            }
        });

        if (!this.isAddMode) {
            this.employeeService.getById(this.id)
                .pipe(first())
                .subscribe(employee => {
                    // Find the account details
                    this.accountService.getById(employee.accountId.toString())
                        .pipe(first())
                        .subscribe(account => {
                            this.selectedAccountName = `${account.firstName} ${account.lastName}`;
                        });

                    // Find the department details
                    this.departmentService.getById(employee.departmentId)
                        .pipe(first())
                        .subscribe(department => {
                            employee.departmentName = department.name;
                        });

                    this.form.patchValue(employee);
                    this.form.get('employeeId').enable();
                });
        }
    }

    // Load all accounts and filter available ones
    private loadAccounts() {
        this.accountService.getAll()
            .pipe(first())
            .subscribe(accounts => {
                this.accounts = accounts;
                
                // Filter out admin accounts and accounts that already have employees
                this.availableAccounts = accounts.filter(account => {
                    return account.role !== Role.Admin && !this.employeeExists(account.id);
                });
            });
    }

    // Check if an employee already exists for an account
    private employeeExists(accountId: string): boolean {
        let exists = false;
        this.employeeService.getByAccountId(accountId)
            .pipe(first())
            .subscribe(employee => {
                exists = !!employee;
            });
        return exists;
    }

    // Load all departments
    private loadDepartments() {
        this.departmentService.getAll()
            .pipe(first())
            .subscribe(departments => {
                this.departments = departments;
            });
    }

    // Generate a random employee ID
    private generateEmployeeId(): string {
        const prefix = 'EMP';
        const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const year = new Date().getFullYear().toString().substr(-2);
        return `${prefix}${year}${randomNum}`;
    }

    // convenience getter for easy access to form fields
    get f() { return this.form.controls; }

    onSubmit() {
        this.submitted = true;
        this.alertService.clear();

        if (this.form.invalid) {
            return;
        }

        this.loading = true;
        if (this.isAddMode) {
            this.createEmployee();
        } else {
            this.updateEmployee();
        }
    }

    private createEmployee() {
        const formData = {
            ...this.form.value,
            employeeId: this.form.get('employeeId').value
        };
        
        this.employeeService.create(formData)
            .pipe(first())
            .subscribe({
                next: () => {
                    this.alertService.success('Employee added successfully', { keepAfterRouteChange: true });
                    this.router.navigate(['/employees']);
                },
                error: error => {
                    this.alertService.error(error);
                    this.loading = false;
                }
            });
    }

    private updateEmployee() {
        const formData = {
            ...this.form.value,
            employeeId: this.form.get('employeeId').value
        };
        
        this.employeeService.update(this.id, formData)
            .pipe(first())
            .subscribe({
                next: () => {
                    this.alertService.success('Employee updated successfully', { keepAfterRouteChange: true });
                    this.router.navigate(['/employees']);
                },
                error: error => {
                    this.alertService.error(error);
                    this.loading = false;
                }
            });
    }

    // Delete modal methods
    openDeleteModal(id: string) {
        this.employeeToDelete = id;
        this.showDeleteModal = true;
    }

    cancelDelete() {
        this.showDeleteModal = false;
        this.employeeToDelete = null;
    }

    confirmDelete() {
        if (!this.employeeToDelete) return;
        
        this.loading = true;
        this.employeeService.delete(this.employeeToDelete)
            .pipe(first())
            .subscribe({
                next: () => {
                    this.alertService.success('Employee deleted successfully', { keepAfterRouteChange: true });
                    this.router.navigate(['/employees']);
                },
                error: error => {
                    this.alertService.error(error);
                    this.loading = false;
                }
            });
    }
} 