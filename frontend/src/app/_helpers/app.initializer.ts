import { AccountService } from '@app/_services';
import { from, of } from 'rxjs';
import { catchError, delay, retry } from 'rxjs/operators';

export function appInitializer(accountService: AccountService) {
    return () => new Promise<void>((resolve) => {
        // Check if we have a stored account first
        const account = accountService.accountValue;
        
        if (!account) {
            // No stored account, just resolve
            console.log('No stored account found during initialization');
            resolve();
            return;
        }

        console.log('Found stored account, attempting to refresh token');
        
        // Try to refresh token on app start up with retry logic
        from(accountService.refreshToken())
            .pipe(
                // Retry up to 2 times with a 1 second delay between attempts
                retry({ count: 2, delay: 1000 }),
                catchError((error) => {
                    console.error('Token refresh failed after retries:', error);
                    // Don't clear account data here - let the user see any error messages
                    // and handle auth redirects in the interceptor
                    return of(null);
                })
            )
            .subscribe({
                next: (result) => {
                    if (result) {
                    console.log('Token refreshed successfully during app initialization');
                    } else {
                        console.log('Token refresh returned null result');
                    }
                    resolve();
                },
                error: (error) => {
                    // This should not be reached due to catchError above, but just in case
                    console.error('Unexpected error during token refresh:', error);
                    resolve();
                },
                complete: () => {
                    resolve();
                }
            });
    });
}