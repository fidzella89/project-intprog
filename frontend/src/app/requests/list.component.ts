import { Component, OnInit } from '@angular/core';
import { first } from 'rxjs/operators';

import { RequestService, AlertService } from '@app/_services';
import { Role } from '@app/_models';

@Component({ templateUrl: 'list.component.html' })
export class ListComponent implements OnInit {
    requests = null;
    loading = false;

    constructor(
        private requestService: RequestService,
        private alertService: AlertService
    ) {}

    ngOnInit() {
        this.loading = true;
        this.requestService.getAll()
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

    deleteRequest(id: string) {
        const request = this.requests.find(x => x.id === id);
        request.isDeleting = true;
        this.requestService.delete(id)
            .pipe(first())
            .subscribe({
                next: () => {
                    this.requests = this.requests.filter(x => x.id !== id);
                    this.alertService.success('Request deleted successfully');
                },
                error: error => {
                    this.alertService.error(error);
                    request.isDeleting = false;
                }
            });
    }
} 