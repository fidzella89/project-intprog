# 🛠️ Profile, Admin & Fake Backend Documentation

<div align="center">
  <img src="https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white" alt="Angular">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Testing-5C9210?style=for-the-badge&logo=jest&logoColor=white" alt="Testing">
</div>

## 📖 Overview

The Profile, Admin, and Fake Backend features form the core management system of our application, enabling:

- 👤 **User Profile Management**: Secure profile updates and account control
- 👑 **Admin Dashboard**: Comprehensive user administration
- 🧪 **Fake Backend**: API simulation for development and testing

## ✨ Key Features

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 30px 0;">

<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #4285F4;">
<h3>👤 Profile Management</h3>
<ul>
  <li>Update personal details</li>
  <li>Change email/password</li>
  <li>Delete account</li>
  <li>Form validation</li>
</ul>
</div>

<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #EA4335;">
<h3>👑 Admin Management</h3>
<ul>
  <li>View all users</li>
  <li>Edit/delete accounts</li>
  <li>Role assignment</li>
  <li>Access control</li>
</ul>
</div>

<div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #FBBC05;">
<h3>🧪 Fake Backend</h3>
<ul>
  <li>API response simulation</li>
  <li>In-memory data storage</li>
  <li>Development testing</li>
  <li>Error scenarios</li>
</ul>
</div>

</div>

## 📂 File Structure

```bash
src/
├── app/
│   ├── profile/               # Profile components
│   │   └── update/            # Update functionality
│   │       ├── update.component.ts    # Business logic
│   │       ├── update.component.html  # Template
│   │       └── update.component.css   # Styles
│   ├── admin/                 # Admin components
│   │   └── user-list/         # User management
│   │       ├── user-list.component.ts
│   │       ├── user-list.component.html
│   │       └── user-list.component.css
│   ├── _helpers/
│   │   └── fake-backend.ts    # API simulation
│   └── _services/             # Core services
│       ├── account.service.ts # User operations
│       └── alert.service.ts   # Notifications
└── environments/              # Configurations
    ├── environment.ts         # Dev settings
    └── environment.prod.ts    # Production settings
💻 Implementation Details
👤 Profile Management
File: update.component.ts

typescript
Copy
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AccountService, AlertService } from '@app/_services';

@Component({ templateUrl: 'update.component.html' })
export class UpdateComponent implements OnInit {
    form: FormGroup;
    loading = false;
    submitted = false;

    constructor(
        private formBuilder: FormBuilder,
        private accountService: AccountService,
        private alertService: AlertService
    ) {}

    ngOnInit() {
        this.form = this.formBuilder.group({
            firstName: ['', Validators.required],
            lastName: ['', Validators.required],
            email: ['', [Validators.required, Validators.email]],
            password: ['', Validators.minLength(6)],
            confirmPassword: ['']
        });
    }

    onSubmit() {
        this.submitted = true;
        if (this.form.invalid) return;

        this.loading = true;
        this.accountService.update(this.form.value).subscribe({
            next: () => this.alertService.success('Update successful'),
            error: error => this.alertService.error(error)
        });
    }
}
👑 Admin Management
File: user-list.component.ts

typescript
Copy
import { Component, OnInit } from '@angular/core';
import { AccountService } from '@app/_services';

@Component({ templateUrl: 'user-list.component.html' })
export class UserListComponent implements OnInit {
    users: any[] = [];

    constructor(private accountService: AccountService) {}

    ngOnInit() {
        this.accountService.getAll()
            .subscribe(users => this.users = users);
    }

    deleteUser(id: string) {
        this.accountService.delete(id)
            .subscribe(() => this.users = this.users.filter(x => x.id !== id));
    }
}
🧪 Fake Backend
File: fake-backend.ts

typescript
Copy
import { Injectable } from '@angular/core';
import { HttpRequest, HttpResponse, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay, mergeMap, materialize, dematerialize } from 'rxjs/operators';

@Injectable()
export class FakeBackendInterceptor implements HttpInterceptor {
    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const users = JSON.parse(localStorage.getItem('users') || '[]');

        return of(null).pipe(mergeMap(() => {
            // Handle registration
            if (request.url.endsWith('/users/register') && request.method === 'POST') {
                const user = request.body;
                if (users.find(x => x.email === user.email)) {
                    return throwError({ error: { message: 'Email already exists' } });
                }
                user.id = users.length ? Math.max(...users.map(x => x.id)) + 1 : 1;
                users.push(user);
                localStorage.setItem('users', JSON.stringify(users));
                return of(new HttpResponse({ status: 200 }));
            }
            return next.handle(request);
        })).pipe(materialize(), delay(500), dematerialize());
    }
}
⚙️ Configuration
typescript
Copy
// environment.ts
export const environment = {
    production: false,
    apiUrl: 'http://localhost:4000/api',
    useFakeBackend: true  // Toggle for real/fake backend
};
� Testing Matrix
Component	Test Cases	Status
Profile Update	Valid inputs	✅
Invalid email format	✅
Short password	✅
Admin Dashboard	User list loading	✅
User deletion	✅
Fake Backend	Duplicate email detection	✅
Data persistence	✅
📸 Screenshots
<div align="center" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
Profile Update
Admin Dashboard
Fake Backend

</div>
📝 Important Notes
Backend Integration:

Ensure endpoints match the expected API structure

Configure CORS properly for local development

Fake Backend:

Only for development/testing

Data resets on page refresh

Simulates network latency (500ms)

Security:

Always validate data on both client and server

Implement proper role verification

<div align="center" style="margin-top: 40px; padding: 20px; background: #f8f9fa; border-radius: 8px;"> <p>Developed with ❤️ by <strong>Cyril John Ypil</strong></p> <p>📅 Last Updated: {Insert Date}</p> </div> ``` 
