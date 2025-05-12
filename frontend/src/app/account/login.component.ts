import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';

import { AccountService, AlertService } from '@app/_services';

@Component({ templateUrl: 'login.component.html' })
export class LoginComponent implements OnInit {
    form!: UntypedFormGroup;
    loading = false;
    submitted = false;
    returnUrl: string = '/';
    
    // New properties for custom error handling
    errorMessage: string | null = null;
    errorType: 'error' | 'warning' | 'info' = 'error';
    emailError: string | null = null;
    passwordError: string | null = null;

    constructor(
        private formBuilder: UntypedFormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private accountService: AccountService,
        private alertService: AlertService
    ) {
        // redirect to home if already logged in
        if (this.accountService.accountValue) {
            this.router.navigate(['/']);
        }
    }

    ngOnInit() {
        this.form = this.formBuilder.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', Validators.required]
        });

        // get return url from route parameters, or last active URL, or default to '/'
        const lastActiveUrl = sessionStorage.getItem('lastActiveUrl');
        this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || lastActiveUrl || '/';
    }

    // convenience getter for easy access to form fields
    get f() { return this.form.controls; }

    onSubmit() {
        this.submitted = true;

        // reset alerts and errors on submit
        this.alertService.clear();
        this.clearErrors();

        // stop here if form is invalid
        if (this.form.invalid) {
            return;
        }

        this.loading = true;
        
        this.accountService.login(this.f.email.value, this.f.password.value)
            .pipe(first())
            .subscribe({
                next: (account) => {
                    // Get the return url from query parameters, or from session storage, or default to '/'
                    const lastActiveUrl = sessionStorage.getItem('lastActiveUrl');
                    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || lastActiveUrl || '/';
                    
                    // Clear the last active URL after using it
                    if (lastActiveUrl) {
                        sessionStorage.removeItem('lastActiveUrl');
                    }
                    
                    // Force a delay to ensure the token is properly processed
                    setTimeout(() => {
                        this.router.navigateByUrl(returnUrl);
                    }, 500);
                },
                error: error => {
                    console.error('Login error details:', {
                        originalError: error,
                        message: typeof error === 'string' ? error : 'Non-string error received',
                        timestamp: new Date().toISOString()
                    });
                    
                    // Clear previous errors
                    this.clearErrors();
                    
                    // Common authentication errors with specific messages
                    if (typeof error === 'string') {
                        const errorLowerCase = error.toLowerCase();
                        
                        // Use the exact error message from the backend
                        // Set appropriate field errors based on error type
                        
                        // Case 1: Email does not exist or is incorrect
                        if (errorLowerCase.includes('email does not exist') || 
                            errorLowerCase.includes('email is incorrect') ||
                            errorLowerCase.includes('email not found')) {
                            this.emailError = error; // Use exact message from backend
                            this.showError(error, 'error');
                            this.loading = false;
                            return;
                        }
                        
                        // Case 2: Email not verified
                        if (errorLowerCase.includes('not verified') || 
                            errorLowerCase.includes('unverified') ||
                            errorLowerCase.includes('verification')) {
                            this.emailError = error; // Use exact message from backend
                            // Display a more appropriate error message without suggesting registration
                            this.showError(`${error} Please check the email account you registered with for the verification link.`, 'warning');
                            this.loading = false;
                            return;
                        }
                        
                        // Case 3: Password is incorrect
                        if (errorLowerCase.includes('password is incorrect')) {
                            this.passwordError = error; // Use exact message from backend
                            this.showError(error, 'error');
                            this.loading = false;
                            return;
                        }
                        
                        // Case 4: Invalid credentials (both email and password might be wrong)
                        if (errorLowerCase.includes('invalid credentials') || errorLowerCase.includes('unauthorized')) {
                            this.emailError = 'Invalid credentials';
                            this.passwordError = 'Invalid credentials';
                            this.showError('Login Failed. Please check your username or password, or you can contact the admin.', 'error');
                            this.loading = false;
                            return;
                        }
                        
                        // Case 5: Account inactive
                        if (errorLowerCase.includes('inactive')) {
                            this.showError(error, 'warning');
                            this.loading = false;
                            return;
                        }
                        
                        // Case 6: Account issue (generic)
                        if (errorLowerCase.includes('account') && (
                            errorLowerCase.includes('issue') || 
                            errorLowerCase.includes('problem')
                        )) {
                            this.showError(error, 'warning');
                            this.loading = false;
                            return;
                        }
                        
                        // Default case: Use the error message directly
                        this.showError('Login Failed. Please check your username or password, or you can contact the admin.', 'error');
                        this.loading = false;
                        return;
                    } else if (error && typeof error === 'object') {
                        // Check for specific error types from the server
                        if (error.errorType === 'unverified' && error.canResendVerification) {
                            this.emailError = error.message || 'Email is not verified';
                            this.showError(`${error.message} If you need a new verification link, please <a href="/account/forgot-password" class="alert-link">reset your password</a> to verify your account.`, 'warning');
                            this.loading = false;
                            return;
                        }
                        
                        // Default handling for object errors
                        const errorMessage = error.message || 'Login Failed. Please check your username or password, or you can contact the admin.';
                        this.showError(errorMessage, 'error');
                        this.loading = false;
                        return;
                    }
                    
                    // If error is not a string, use a generic message
                    console.error('Non-string error received in login component:', error);
                    this.passwordError = 'Authentication failed';
                    this.showError('Login Failed. Please check your username or password, or you can contact the admin.', 'error');
                    this.loading = false;
                }
            });
    }
    
    // Helper method to show error message
    showError(message: string, type: 'error' | 'warning' | 'info' = 'error') {
        this.errorMessage = message;
        this.errorType = type;
    }
    
    // Helper method to clear all errors
    clearErrors() {
        this.errorMessage = null;
        this.emailError = null;
        this.passwordError = null;
    }
    
    // Method to clear the error banner
    clearError() {
        this.errorMessage = null;
    }
}
