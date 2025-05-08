import { Component, OnInit } from '@angular/core';
import { first } from 'rxjs/operators';

import { DepartmentService, AlertService } from '@app/_services';

@Component({ 
    templateUrl: 'list.component.html',
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
export class ListComponent implements OnInit {
    departments = null;
    departmentToDelete = null;
    showDeleteModal = false;

    constructor(
        private departmentService: DepartmentService,
        private alertService: AlertService
    ) {}

    ngOnInit() {
        this.departmentService.getAll()
            .pipe(first())
            .subscribe(departments => this.departments = departments);
    }

    openDeleteModal(department) {
        this.departmentToDelete = department;
        this.showDeleteModal = true;
        document.body.classList.add('modal-open');
    }

    confirmDelete() {
        if (!this.departmentToDelete) return;
        
        const department = this.departmentToDelete;
        department.isDeleting = true;

        this.departmentService.delete(department.id)
            .pipe(first())
            .subscribe({
                next: () => {
                    this.departments = this.departments.filter(x => x.id !== department.id);
                    this.alertService.success('Department deleted successfully');
                    this.closeDeleteModal();
                },
                error: error => {
                    this.alertService.error(error);
                    department.isDeleting = false;
                    this.closeDeleteModal();
                }
            });
    }

    closeDeleteModal() {
        this.showDeleteModal = false;
        document.body.classList.remove('modal-open');
        this.departmentToDelete = null;
    }
} 