import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { first } from 'rxjs/operators';

import { AccountService, EmployeeService, DepartmentService, AlertService } from '@app/_services';
import { Employee, Department } from '@app/_models';

@Component({ templateUrl: 'list.component.html' })
export class ListComponent implements OnInit {
    employees: Employee[] = [];
    departments: Department[] = [];
    showDeleteModal = false;
    showDepartmentModal = false;
    employeeToDelete: Employee | null = null;
    selectedEmployee: Employee | null = null;
    newDepartmentId: string = '';
    loading = false;
    submitted = false;

    // Computed property to get available departments (excluding current department)
    get availableDepartments(): Department[] {
        if (!this.selectedEmployee) return this.departments;
        return this.departments.filter(dept => {
            if (!dept.id || !this.selectedEmployee?.departmentId) return true;
            return dept.id.toString() !== this.selectedEmployee.departmentId.toString();
        });
    }

    constructor(
        private accountService: AccountService,
        private employeeService: EmployeeService,
        private departmentService: DepartmentService,
        private alertService: AlertService,
        private router: Router
    ) {}

    ngOnInit() {
        this.loadEmployees();
        this.loadDepartments();
    }

    private loadEmployees() {
        this.loading = true;
        this.employeeService.getAll()
            .pipe(first())
            .subscribe({
                next: employees => {
                    this.employees = employees;
                    // Load department names for each employee
                    this.employees.forEach(employee => {
                        this.departmentService.getById(employee.departmentId)
                            .pipe(first())
                            .subscribe({
                                next: department => {
                                    employee.departmentName = department.name;
                                },
                                error: error => {
                                    console.error('Error fetching department:', error);
                                    employee.departmentName = 'Unknown Department';
                                }
                            });
                    });
                    this.loading = false;
                },
                error: error => {
                    const errorMessage = error.message || 'Failed to load employees';
                    this.alertService.error(errorMessage);
                    this.loading = false;
                }
            });
    }

    private loadDepartments() {
        this.departmentService.getAll()
            .pipe(first())
            .subscribe(departments => {
                this.departments = departments;
            });
    }

    openDeleteModal(employee: Employee) {
        this.employeeToDelete = employee;
        this.showDeleteModal = true;
    }

    cancelDelete() {
        this.showDeleteModal = false;
        this.employeeToDelete = null;
    }

    confirmDelete() {
        if (!this.employeeToDelete) return;

        this.loading = true;
        const id = this.employeeToDelete.id;
        this.employeeService.delete(id)
            .pipe(first())
            .subscribe({
                next: () => {
                    this.employees = this.employees.filter(x => x.id !== id);
                    this.showDeleteModal = false;
                    this.employeeToDelete = null;
                    this.loading = false;
                    this.alertService.success('Employee deleted successfully');
                },
                error: error => {
                    this.alertService.error(error);
                    this.loading = false;
                }
            });
    }

    // Change Department methods
    openChangeDepartment(employee: Employee) {
        this.selectedEmployee = employee;
        this.newDepartmentId = '';
        this.submitted = false;
        this.showDepartmentModal = true;
    }

    cancelChangeDepartment() {
        this.showDepartmentModal = false;
        this.selectedEmployee = null;
        this.newDepartmentId = '';
        this.submitted = false;
    }

    confirmChangeDepartment() {
        this.submitted = true;
        if (!this.newDepartmentId || !this.selectedEmployee) return;

        this.loading = true;
        const updateData = {
            ...this.selectedEmployee,
            departmentId: this.newDepartmentId
        };

        this.employeeService.update(this.selectedEmployee.id, updateData)
            .pipe(first())
            .subscribe({
                next: () => {
                    this.showDepartmentModal = false;
                    this.alertService.success('Department changed successfully');
                    this.loadEmployees(); // Reload the list to show updated data
                    this.loading = false;
                    this.selectedEmployee = null;
                    this.newDepartmentId = '';
                    this.submitted = false;
                },
                error: error => {
                    this.alertService.error(error);
                    this.loading = false;
                }
            });
    }

    viewRequests(employeeId: string) {
        // Get the employee object
        const employee = this.employees.find(e => e.id === employeeId);
        if (employee && employee.id) {
            this.router.navigate(['/requests'], { queryParams: { employeeId: employee.id } });
        }
    }

    viewWorkflows(employeeid: string) {
        if (employeeid) {
            this.router.navigate(['/workflows'], { queryParams: { employeeid } });
        }
    }
} 