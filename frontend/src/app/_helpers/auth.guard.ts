import { Injectable } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AccountService } from '@app/_services';
import { AlertService } from '@app/_services';

@Injectable({ providedIn: 'root' })
export class AuthGuard {
    constructor(
        private router: Router,
        private accountService: AccountService,
        private alertService: AlertService
    ) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
        const account = this.accountService.accountValue;
        
        if (!account) {
            // Check if we're already on the login page to prevent loops
            if (state.url.startsWith('/account/login')) {
                return of(true);
            }

            // Not logged in, show message and redirect to login
            this.alertService.error('You are unauthorized. Please log in.', { 
                keepAfterRouteChange: true,
                autoClose: true,
                autoCloseTimeout: 6000 // 6 seconds
            });
            this.router.navigate(['/account/login'], { queryParams: { returnUrl: state.url } });
            return of(false);
        }

        // Always try to refresh token before accessing protected routes
        return this.accountService.refreshToken().pipe(
            map(() => {
                const currentAccount = this.accountService.accountValue;
                
                // Check if route requires specific roles
                if (route.data['roles'] && !route.data['roles'].includes(currentAccount?.role)) {
                    this.alertService.error('You are unauthorized to access this page.', { 
                        keepAfterRouteChange: true,
                        autoClose: true,
                        autoCloseTimeout: 6000 // 6 seconds
                    });
                    this.router.navigate(['/']);
                    return false;
                }
                
                return true;
            }),
            catchError((error) => {
                this.alertService.error('Your session has expired. Please log in again.', { 
                    keepAfterRouteChange: true,
                    autoClose: true,
                    autoCloseTimeout: 6000 // 6 seconds
                });
                this.router.navigate(['/account/login'], { queryParams: { returnUrl: state.url } });
                return of(false);
            })
        );
    }
}