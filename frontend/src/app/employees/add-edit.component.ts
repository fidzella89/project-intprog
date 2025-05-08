import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';

import { AccountService, AlertService, EmployeeService, DepartmentService } from '@app/_services';
import { Employee, Account, Department, Role } from '@app/_models';

// Update Employee interface to allow string for hireDate
interface EmployeeForm extends Omit<Employee, 'hireDate'> {
    hireDate: string;
}

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
    existingEmployeeIds: string[] = [];
    showDeleteModal = false;
    showDepartmentModal = false;
    employeeToDelete: string = null;
    newDepartmentId: string = '';
    currentEmployee: EmployeeForm = null;

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
        
        // Load all necessary data
        this.loadAccounts();
        this.loadDepartments();
        this.loadExistingEmployeeIds();
        
        this.form = this.formBuilder.group({
            accountId: [{ value: '', disabled: !this.isAddMode }, Validators.required],
            employeeId: [{ value: '', disabled: true }, Validators.required],
            departmentId: [{ value: '', disabled: !this.isAddMode }, Validators.required],
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
                    // Convert Date to string for the form
                    const employeeForm: EmployeeForm = {
                        ...employee,
                        hireDate: employee.hireDate ? new Date(employee.hireDate).toISOString().split('T')[0] : ''
                    };
                    this.currentEmployee = employeeForm;

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
                            this.currentEmployee.departmentName = department.name;
                        });

                    // Patch all form values
                    Object.keys(this.form.controls).forEach(key => {
                        this.form.get(key).patchValue(employeeForm[key]);
                    });
                });
        } else {
            // Generate unique employee ID for new employees
            this.generateUniqueEmployeeId();
        }
    }

    // Load existing employee IDs to ensure uniqueness
    private loadExistingEmployeeIds() {
        this.employeeService.getAll()
            .pipe(first())
            .subscribe(employees => {
                this.existingEmployeeIds = employees.map(e => e.employeeId);
                if (this.isAddMode) {
                    this.generateUniqueEmployeeId();
                }
            });
    }

    // Load all accounts and filter available ones
    private loadAccounts() {
        // First, get all employees to know which accounts are already assigned
        this.employeeService.getAll()
            .pipe(first())
            .subscribe(employees => {
                const usedAccountIds = employees.map(e => e.accountId.toString());
                
                // Then load all accounts and filter them
                this.accountService.getAll()
                    .pipe(first())
                    .subscribe(accounts => {
                        this.accounts = accounts;
                        
                        // Filter accounts:
                        // 1. Remove admin accounts
                        // 2. Remove accounts that are already assigned to employees (except in edit mode for current account)
                        this.availableAccounts = accounts.filter(account => {
                            const isAdmin = account.role === Role.Admin;
                            const isAlreadyAssigned = usedAccountIds.includes(account.id);
                            const isCurrentAccount = !this.isAddMode && account.id === this.form?.get('accountId')?.value;
                            
                            return !isAdmin && (!isAlreadyAssigned || isCurrentAccount);
                        });

                        // If in edit mode, ensure the current account is in the list
                        if (!this.isAddMode && this.form?.get('accountId')?.value) {
                            const currentAccount = this.accounts.find(a => a.id === this.form.get('accountId').value);
                            if (currentAccount && !this.availableAccounts.some(a => a.id === currentAccount.id)) {
                                this.availableAccounts.push(currentAccount);
                            }
                        }

                        // Sort accounts by name for better UX
                        this.availableAccounts.sort((a, b) => 
                            `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
                        );
                    });
            });
    }

    // Load all departments
    private loadDepartments() {
        this.departmentService.getAll()
            .pipe(first())
            .subscribe(departments => {
                this.departments = departments;
            });
    }

    // Generate a unique employee ID
    private generateUniqueEmployeeId() {
        let newId: string;
        do {
            const prefix = 'EMP';
            const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            const year = new Date().getFullYear().toString().substr(-2);
            newId = `${prefix}${year}${randomNum}`;
        } while (this.existingEmployeeIds.includes(newId));

        this.form.get('employeeId').patchValue(newId);
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
            ...this.form.getRawValue() // Get values from disabled fields too
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
            ...this.form.getRawValue() // Get values from disabled fields too
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

    // Change Department modal methods
    openChangeDepartment() {
        this.newDepartmentId = '';
        this.showDepartmentModal = true;
    }

    cancelChangeDepartment() {
        this.showDepartmentModal = false;
        this.newDepartmentId = '';
    }

    confirmChangeDepartment() {
        if (!this.newDepartmentId || !this.currentEmployee) return;
        
        this.loading = true;
        const updateData: Employee = {
            ...this.currentEmployee,
            departmentId: this.newDepartmentId,
            hireDate: new Date(this.currentEmployee.hireDate)
        };
        
        this.employeeService.update(this.id, updateData)
            .pipe(first())
            .subscribe({
                next: () => {
                    this.alertService.success('Department changed successfully', { keepAfterRouteChange: true });
                    this.router.navigate(['/employees']);
                },
                error: error => {
                    this.alertService.error(error);
                    this.loading = false;
                }
            });
    }
} 