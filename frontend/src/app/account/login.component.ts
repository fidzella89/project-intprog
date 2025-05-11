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

        // reset alerts on submit
        this.alertService.clear();

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
                    
                    // Special handling for unverified account errors
                    if (error.includes('not verified')) {
                        // Display error with HTML link to register page
                        this.alertService.error(`${error} <a href="/account/register" class="alert-link">Register again</a>`, { 
                            autoClose: false, 
                            keepAfterRouteChange: false 
                        });
                    } else {
                        // Standard error handling
                        this.alertService.error(error);
                    }
                    
                    this.loading = false;
                }
            });
    }
}
