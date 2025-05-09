import { Injectable } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AccountService } from '@app/_services';

@Injectable({ providedIn: 'root' })
export class AuthGuard {
    constructor(
        private router: Router,
        private accountService: AccountService
    ) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
        const account = this.accountService.accountValue;
        
        if (!account) {
            this.router.navigate(['/account/login'], { queryParams: { returnUrl: state.url } });
            return of(false);
        }

        // Check if token is valid or needs refresh
        if (!this.accountService.isTokenValid(account)) {
            console.log('Token needs refresh in auth guard');
            // Try to refresh the token
            return this.accountService.refreshToken().pipe(
                map(() => {
                    console.log('Token refresh successful in auth guard');
                    // Check role after successful refresh
                    if (route.data['roles'] && !route.data['roles'].includes(this.accountService.accountValue?.role)) {
                        this.router.navigate(['/']);
                        return false;
                    }
                    return true;
                }),
                catchError((error) => {
                    console.error('Token refresh failed in auth guard:', error);
                    this.router.navigate(['/account/login'], { queryParams: { returnUrl: state.url } });
                    return of(false);
                })
            );
        }

        // Check if user has required role
        if (route.data['roles'] && !route.data['roles'].includes(account.role)) {
            console.log('User does not have required role');
            this.router.navigate(['/']);
            return of(false);
        }

        return of(true);
    }
}