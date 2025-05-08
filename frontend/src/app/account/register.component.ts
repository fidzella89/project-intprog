import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { first } from 'rxjs/operators';

import { AccountService, AlertService } from '@app/_services';
import { MustMatch } from '@app/_helpers';

@Component({ templateUrl: 'register.component.html' })
export class RegisterComponent implements OnInit {
    form: UntypedFormGroup;
    loading = false;
    submitted = false;
    verificationToken: string = null;
    verificationUrl: string = null;
    verificationApiUrl: string = null;
    registrationSuccessful = false;

    constructor(
        private formBuilder: UntypedFormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private accountService: AccountService,
        private alertService: AlertService
    ) { }

    ngOnInit() {
        this.form = this.formBuilder.group({
            title: ['', Validators.required],
            firstName: ['', Validators.required],
            lastName: ['', Validators.required],
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]],
            confirmPassword: ['', Validators.required],
            acceptTerms: [false, Validators.requiredTrue]
        }, {
            validator: MustMatch('password', 'confirmPassword')
        });
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
        this.accountService.register(this.form.value)
            .pipe(first())
            .subscribe({
                next: (response) => {
                    if (response && response.body) {
                        const body = response.body as any;
                        this.registrationSuccessful = true;
                        this.verificationToken = body.verificationToken;
                        this.verificationUrl = body.verificationUrl;
                        this.verificationApiUrl = body.verificationApiUrl;
                        
                        this.alertService.success(
                            body.message || 'Registration successful, please check your email for verification instructions',
                            { keepAfterRouteChange: false }
                        );
                    } else {
                        this.alertService.success(
                            'Registration successful, please check your email for verification instructions',
                            { keepAfterRouteChange: true }
                        );
                        this.router.navigate(['../login'], { relativeTo: this.route });
                    }
                    this.loading = false;
                },
                error: error => {
                    this.alertService.error(error);
                    this.loading = false;
                }
            });
    }

    verifyNow() {
        if (this.verificationToken) {
            this.loading = true;
            this.accountService.verifyEmail(this.verificationToken)
                .pipe(first())
                .subscribe({
                    next: () => {
                        this.alertService.success('Verification successful, you can now login', { keepAfterRouteChange: true });
                        this.router.navigate(['../login'], { relativeTo: this.route });
                    },
                    error: error => {
                        this.alertService.error(error);
                        this.loading = false;
                    }
                });
        }
    }
}