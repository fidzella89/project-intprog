import { Component, OnInit } from '@angular/core';
import { first } from 'rxjs/operators';
import { RequestService, AlertService, AccountService } from '@app/_services';
import { Role } from '@app/_models';
declare var bootstrap: any;

@Component({ templateUrl: 'list.component.html' })
export class ListComponent implements OnInit {
    requests: any[] = [];
    loading = false;
    isAdmin = false;
    selectedRequest: any = null;
    deleteModal: any;
    isDeleting = false;

    constructor(
        private requestService: RequestService,
        private alertService: AlertService,
        private accountService: AccountService
    ) {
        this.isAdmin = this.accountService.accountValue?.role === Role.Admin;
    }

    ngOnInit() {
        this.loading = true;
        this.requestService.getAll()
            .pipe(first())
            .subscribe({
                next: (requests: any[]) => {
                    this.requests = requests;
                    this.loading = false;
                },
                error: error => {
                    this.alertService.error(error);
                    this.loading = false;
                }
            });
    }

    changeStatus(id: string, newStatus: string) {
        const request = this.requests.find(x => x.id === id);
        if (!request) return;

        request.isUpdating = true;
        this.requestService.changeStatus(id, newStatus, `Status changed to ${newStatus} by admin`)
            .pipe(first())
            .subscribe({
                next: () => {
                    request.status = newStatus;
                    // Update workflow status if it exists
                    if (request.workflows?.length > 0) {
                        request.workflows[0].status = newStatus;
                    }
                    request.isUpdating = false;
                    this.alertService.success('Status updated successfully');
                },
                error: error => {
                    this.alertService.error(error);
                    request.isUpdating = false;
                }
            });
    }

    openDeleteModal(request: any) {
        this.selectedRequest = request;
        this.deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
        this.deleteModal.show();
    }

    confirmDelete() {
        if (!this.selectedRequest) return;
        
        this.isDeleting = true;
        this.requestService.delete(this.selectedRequest.id)
            .pipe(first())
            .subscribe({
                next: () => {
                    this.deleteModal.hide();
                    this.alertService.success('Request deleted successfully', { keepAfterRouteChange: true });
                    this.requests = this.requests.filter(x => x.id !== this.selectedRequest.id);
                    this.isDeleting = false;
                    this.selectedRequest = null;
                },
                error: error => {
                    this.alertService.error(error);
                    this.isDeleting = false;
                }
            });
    }
} 