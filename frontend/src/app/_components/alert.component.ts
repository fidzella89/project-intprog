import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { Router, NavigationStart } from '@angular/router';
import { Subscription } from 'rxjs';

import { Alert, AlertType } from '@app/_models';
import { AlertService } from '@app/_services';

@Component({ selector: 'alert', templateUrl: 'alert.component.html' })
export class AlertComponent implements OnInit, OnDestroy {
    @Input() id = 'default-alert';
    @Input() fade = true;
    alerts: Alert[] = [];
    alertSubscription!: Subscription;
    routeSubscription!: Subscription;
    
    // Make the AlertType enum available in the template
    AlertType = AlertType;

    constructor(private router: Router, private alertService: AlertService) { }

    ngOnInit() {
        // subscribe to new alert notifications
        this.alertSubscription = this.alertService.onAlert(this.id)
            .subscribe(alert => {
                // clear alerts when an empty alert is received
                if (!alert.message) {
                    // filter out alerts without 'keepAfterRouteChange' flag
                    this.alerts = this.alerts.filter(x => x.keepAfterRouteChange);
                    // remove 'keepAfterRouteChange' flag on the rest
                    this.alerts.forEach(x => {
                        if (x.keepAfterRouteChange) {
                            x.keepAfterRouteChange = false;
                        }
                    });
                    return;
                }

                // add alert to array
                this.alerts.push(alert);

                // auto close alert if required
                if (alert.autoClose) {
                    setTimeout(() => this.removeAlert(alert), 5000);
                }
            });

        // clear alerts on location change
        this.routeSubscription = this.router.events.subscribe(event => {
            if (event instanceof NavigationStart) {
                this.alertService.clear(this.id);
            }
        });
    }

    ngOnDestroy() {
        // unsubscribe to avoid memory leaks
        this.alertSubscription.unsubscribe();
        this.routeSubscription.unsubscribe();
    }

    removeAlert(alert: Alert) {
        // check if already removed to prevent error on auto close
        if (!this.alerts.includes(alert)) return;

        if (this.fade) {
            // fade out alert
            alert.fade = true;

            // remove alert after faded out
            setTimeout(() => {
                this.alerts = this.alerts.filter(x => x !== alert);
            }, 250);
        } else {
            // remove alert
            this.alerts = this.alerts.filter(x => x !== alert);
        }
    }

    // Get the Bootstrap alert class based on alert type
    getAlertClass(alert: Alert) {
        if (!alert) return '';

        const classes = [];

        if (alert.fade) {
            classes.push('fade');
        }

        const alertType = Number(alert.type);
        
        if (alertType === AlertType.Success) {
            classes.push('alert-success');
        } else if (alertType === AlertType.Error) {
            classes.push('alert-danger');
        } else if (alertType === AlertType.Info) {
            classes.push('alert-info');
        } else if (alertType === AlertType.Warning) {
            classes.push('alert-warning');
        }

        return classes.join(' ');
    }

    // Get the Font Awesome icon class based on alert type
    getAlertIcon(alert: Alert) {
        if (!alert) return '';

        const alertType = Number(alert.type);
        
        if (alertType === AlertType.Success) {
            return 'fas fa-check-circle';
        } else if (alertType === AlertType.Error) {
            return 'fas fa-exclamation-circle';
        } else if (alertType === AlertType.Info) {
            return 'fas fa-info-circle';
        } else if (alertType === AlertType.Warning) {
            return 'fas fa-exclamation-triangle';
        }
        
        return 'fas fa-info-circle';
    }
}