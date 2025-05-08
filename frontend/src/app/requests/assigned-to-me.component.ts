import { Component, OnInit } from '@angular/core';
import { first } from 'rxjs/operators';

import { RequestService, AlertService } from '@app/_services';

@Component({ templateUrl: 'assigned-to-me.component.html' })
export class AssignedToMeComponent implements OnInit {
    requests = null;
    loading = false;

    constructor(
        private requestService: RequestService,
        private alertService: AlertService
    ) {}

    ngOnInit() {
        this.loading = true;
        this.requestService.getAssignedToMe()
            .pipe(first())
            .subscribe({
                next: requests => {
                    this.requests = requests;
                    this.loading = false;
                },
                error: error => {
                    this.alertService.error(error);
                    this.loading = false;
                }
            });
    }

    changeStatus(id: string, status: string) {
        const comments = prompt('Please enter comments for this status change:');
        if (comments === null) return; // User cancelled

        const request = this.requests.find(x => x.id === id);
        request.isUpdating = true;
        
        this.requestService.changeStatus(id, status, comments)
            .pipe(first())
            .subscribe({
                next: () => {
                    request.status = status;
                    request.isUpdating = false;
                    this.alertService.success('Request status updated successfully');
                },
                error: error => {
                    this.alertService.error(error);
                    request.isUpdating = false;
                }
            });
    }
} 