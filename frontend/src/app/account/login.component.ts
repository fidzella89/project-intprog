import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { first, finalize } from 'rxjs/operators';

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
        this.accountService.login(this.f.email.value, this.f.password.value)
            .pipe(
                first(),
                finalize(() => {
                    this.loading = false;
                })
            )
            .subscribe({
                next: (account) => {
                    console.log('Login successful:', account);
                    
                    // Check account status
                    if (account.status === 'Inactive') {
                        this.alertService.error('Account is inactive. Please contact administrator.');
                        return;
                    }
                    
                    if (account && account.jwtToken) {
                        // Get the return url from route parameters or default to '/'
                        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
                        
                        // Use router.navigateByUrl for more reliable navigation
                        this.router.navigateByUrl(returnUrl, { replaceUrl: true })
                            .then(() => {
                                console.log('Navigation successful to:', returnUrl);
                            })
                            .catch(error => {
                                console.error('Navigation failed:', error);
                                // Fallback to home page if navigation fails
                                this.router.navigateByUrl('/', { replaceUrl: true });
                            });
                    } else {
                        this.alertService.error('Login failed: Invalid response from server');
                    }
                },
                error: error => {
                    console.error('Login error:', error);
                    this.alertService.error(error);
                }
            });
    }
}
