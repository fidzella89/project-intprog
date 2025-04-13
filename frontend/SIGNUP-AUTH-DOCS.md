# ✨ Signup Authorization Feature

This document provides a detailed overview of the **Signup Authorization** feature in the **Front-End User Management App**. It includes implementation details, file structure, setup instructions, and other important notes.

---

## 📚 Table of Contents

- [🔍 Overview](#-overview)
- [🌟 Features](#-features)
- [📁 File Structure](#-file-structure)
- [🛠️ Implementation](#-implementation)
- [⚙️ Setup](#️-setup)
- [🧪 Testing](#-testing)
- [🖼️ Screenshots](#️-screenshots)
- [📝 Notes](#-notes)
- [👤 Author](#-author)

---

## 🔍 Overview

The **Signup Authorization** feature allows new users to register for an account by providing their personal details. The system validates inputs, sends a verification email, and activates the account upon successful verification.

---

## 🌟 Features

- ✅ User registration with form validation
- ✅ Email verification to confirm user identity
- ✅ Password strength validation
- ✅ Error handling for invalid inputs or duplicate accounts

---

## 📁 File Structure
src/
└── app/
├── auth/
│ └── register/
│ ├── register.component.ts // Signup logic
│ ├── register.component.html // Signup form UI
│ └── register.component.css // Signup form styles
├── _services/
│ └── account.service.ts // API calls (register)
├── _helpers/
│ └── must-match.validator.ts // Password match validator
└── environments/
└── environment.ts // API base URL config
angular.json // Global style setup




---

## 🛠️ Implementation

### Signup Form

The form uses **Angular Reactive Forms** with these fields:

| Field            | Validation Rules                          |
|------------------|------------------------------------------|
| First Name       | Required                                 |
| Last Name        | Required                                 |
| Email            | Required, valid email format             |
| Password         | Required, minimum 6 characters           |
| Confirm Password | Must match password field                |

### Code Snippets

<details>
<summary><strong>register.component.ts</strong></summary>

```typescript
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AccountService, AlertService } from '@app/_services';
import { MustMatch } from '@app/_helpers';

@Component({ templateUrl: 'register.component.html' })
export class RegisterComponent implements OnInit {
    form: FormGroup;
    loading = false;
    submitted = false;

    constructor(
        private formBuilder: FormBuilder,
        private router: Router,
        private accountService: AccountService,
        private alertService: AlertService
    ) {}

    ngOnInit() {
        this.form = this.formBuilder.group({
            firstName: ['', Validators.required],
            lastName: ['', Validators.required],
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]],
            confirmPassword: ['', Validators.required]
        }, {
            validator: MustMatch('password', 'confirmPassword')
        });
    }

    // ... rest of the component code ...
}
```
```
</details><details> <summary><strong>register.component.html</strong></summary>
<form [formGroup]="form" (ngSubmit)="onSubmit()">
    <div class="form-group">
        <label>First Name</label>
        <input type="text" formControlName="firstName" 
               class="form-control" [ngClass]="{'is-invalid': submitted && f.firstName.errors}">
        <div *ngIf="submitted && f.firstName.errors" class="invalid-feedback">
            First Name is required
        </div>
    </div>
    
    <!-- Other form fields similarly structured -->
</form>
```
</details>
⚙️ Setup

Backend API Configuration
```
register(user: any) {
    return this.http.post(`${environment.apiUrl}/users/register`, user);
}
```
Environment Configuration
```
export const environment = {
    production: false,
    apiUrl: 'http://localhost:4000/api'
};
```
🧪 Testing
Test Case	Expected Result
Valid inputs	Successful registration
Duplicate email	Error message displayed
Password < 6 chars	Validation error
Mismatched passwords	"Passwords must match" error
Empty required field	Field-specific error message

🖼️ Screenshots
Signup Form	Validation Errors
📝 Notes
Ensure backend handles email verification

Test edge cases:

Duplicate emails

Invalid inputs

Server downtime scenarios

👤 Author
Developed by Ken Harvey Doblas
