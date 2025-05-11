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

        // get return url from route parameters or default to '/'
        this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
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
        
        console.log('Attempting login with:', this.f.email.value);
        
        this.accountService.login(this.f.email.value, this.f.password.value)
            .pipe(first())
            .subscribe({
                next: (account) => {
                    console.log('Login successful, received account data:', account);
                    
                    // Get the return url from query parameters or default to '/'
                    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
                    
                    console.log('Navigating to:', returnUrl);
                    
                    // Force a delay to ensure the token is properly processed
                    setTimeout(() => {
                        this.router.navigateByUrl(returnUrl);
                    }, 500);
                },
                error: error => {
                    console.error('Login error:', error);
                    
                    // Clear previous errors
                    this.clearErrors();
                    
                    // Handle specific error types
                    if (typeof error === 'string') {
                        const errorLowerCase = error.toLowerCase();
                        
                        if (errorLowerCase.includes('email does not exist')) {
                            this.emailError = 'Email does not exist';
                            this.showError('The email address you entered does not exist in our system. Please check your email or register for a new account.', 'error');
                        }
                        else if (errorLowerCase.includes('email is incorrect')) {
                            this.emailError = 'Email is incorrect';
                            this.showError('The email address you entered is not registered in our system.', 'error');
                        } 
                        else if (errorLowerCase.includes('password is incorrect')) {
                            this.passwordError = 'Password is incorrect';
                            this.showError('The password you entered is incorrect. Please try again or use "Forgot Password".', 'error');
                        }
                        // Special handling for when both email and password might be wrong
                        else if (errorLowerCase.includes('invalid credentials') || errorLowerCase.includes('unauthorized')) {
                            this.emailError = 'Email may be incorrect';
                            this.passwordError = 'Password may be incorrect';
                            this.showError('The email or password you entered is incorrect. Please check your credentials and try again.', 'error');
                        }
                        // Special handling for unverified account errors
                        else if (error.includes('not verified')) {
                            // Display error with HTML link to register page
                            this.showError(`${error} <a href="/account/register" class="alert-link">Register again</a>`, 'warning');
                        } 
                        // Special handling for inactive account
                        else if (error.includes('inactive')) {
                            this.showError(error, 'warning');
                        }
                        else {
                            // Standard error handling
                            this.showError(error, 'error');
                        }
                    } else {
                        // If error is not a string, use a generic message
                        this.showError('Login failed. Please try again.', 'error');
                    }
                    
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
