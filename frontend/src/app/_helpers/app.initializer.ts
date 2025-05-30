import { AccountService } from '@app/_services';
import { from, of } from 'rxjs';
import { catchError, delay, retry } from 'rxjs/operators';

export function appInitializer(accountService: AccountService) {
    return () => new Promise<void>((resolve) => {
        // Check if we have a stored account first
        const account = accountService.accountValue;
        
        if (!account || !account.jwtToken) {
            // No stored account or token, just resolve
            resolve();
            return;
        }
        
        // Try to refresh token on app start up with retry logic
        from(accountService.refreshToken())
            .pipe(
                // Retry up to 2 times with a 1 second delay between attempts
                retry({ count: 2, delay: 1000 }),
                catchError((error) => {
                    // Don't clear account data here - let the user see any error messages
                    // and handle auth redirects in the interceptor
                    return of(null);
                })
            )
            .subscribe({
                next: (result) => {
                    // Token refreshed successfully or not, either way we should resolve
                    resolve();
                },
                error: (error) => {
                    // This should not be reached due to catchError above, but just in case
                    resolve();
                },
                complete: () => {
                    resolve();
                }
            });
    });
}