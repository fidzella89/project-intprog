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
        
        if (!account || !account.jwtToken) {
            // Not logged in, redirect to login page with return url
            this.router.navigate(['/account/login'], { queryParams: { returnUrl: state.url } });
            return of(false);
        }

        // Check if token is expired - refresh token will handle if needed
        return this.accountService.refreshToken().pipe(
            switchMap(() => {
                const currentAccount = this.accountService.accountValue;
                
                // Check if route requires specific roles
                if (route.data['roles'] && !route.data['roles'].includes(currentAccount?.role)) {
                    this.alertService.error('You are unauthorized to access this page.', {
                        keepAfterRouteChange: true,
                        autoClose: true,
                        autoCloseTimeout: 6000
                    });
                    this.router.navigate(['/']);
                    return of(false);
                }
                
                return of(true);
            }),
            catchError(error => {
                console.error('Auth Guard: Token refresh failed:', error);
                this.alertService.error('Your session has expired. Please log in again.', {
                    keepAfterRouteChange: true,
                    autoClose: true,
                    autoCloseTimeout: 6000
                });
                this.router.navigate(['/account/login'], { queryParams: { returnUrl: state.url } });
                return of(false);
            })
        );
    }
}