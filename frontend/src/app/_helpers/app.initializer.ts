import { AccountService } from '@app/_services';

export function appInitializer(accountService: AccountService) {
    return () => new Promise<void>((resolve) => {
        // Check if we have a stored account first
        const account = accountService.accountValue;
        
        if (!account) {
            // No stored account, just resolve
            resolve();
            return;
        }

        // Always try to refresh token on app start up
        accountService.refreshToken()
            .subscribe({
                next: () => {
                    console.log('Token refreshed successfully during app initialization');
                    resolve();
                },
                error: (error) => {
                    console.error('Token refresh failed during app initialization:', error);
                    // Clear any stored data to ensure clean state
                    accountService.clearAccountData();
                    resolve();
                }
            });
    });
}