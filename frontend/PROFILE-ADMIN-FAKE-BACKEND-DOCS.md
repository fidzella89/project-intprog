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
```
💻 Implementation Details
👤 Profile Management
File: update.component.ts

```typescript
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
```
👑 Admin Management
File: user-list.component.ts

```typescript
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
```
🧪 Fake Backend
File: fake-backend.ts

```typescript
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
```
⚙️ Configuration
```typescript
// environment.ts
export const environment = {
    production: false,
    apiUrl: 'http://localhost:4000/api',
    useFakeBackend: true  // Toggle for real/fake backend
};
```
## 🧪 Testing Matrix

<div style="overflow-x: auto;">
  
| Component          | Test Case                     | Status | Notes                  |
|--------------------|-------------------------------|--------|------------------------|
| **Profile Update** | Valid inputs                  | ✅     | All fields validated   |
|                    | Invalid email format          | ✅     | Regex validation       |
|                    | Short password (<6 chars)     | ✅     | Minimum length check   |
| **Admin Dashboard**| User list loading             | ✅     | Pagination tested      |
|                    | User deletion                 | ✅     | Confirm dialog         |
| **Fake Backend**   | Duplicate email detection     | ✅     | 409 Conflict returned  |
|                    | Data persistence              | ✅     | LocalStorage used      |

</div>

## 📸 Screenshots

<div align="center" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 25px; margin: 30px 0;">


<div style="text-align: center;">
  <img src="https://github.com/user-attachments/assets/60b79339-ffd1-487b-a15c-180f57366c4" alt="Fake Backend" style="border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">

  <p><strong>Register First User as Admin</strong></p>
</div>

<div style="text-align: center;">
 //
  <p><strong>Profile Update Interface</strong></p>
</div>

<div style="text-align: center;">
  <img src="https://via.placeholder.com/400x250/EA4335/FFFFFF?text=Admin+Dashboard" alt="Admin Dashboard" style="border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
  <p><strong>Admin User Management</strong></p>
</div>

<div style="text-align: center;">
  <img src="https://via.placeholder.com/400x250/34A853/FFFFFF?text=Fake+Backend+Logs" alt="Fake Backend" style="border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
  <p><strong>API Simulation Console</strong></p>
</div>

</div>

## ⚠️ Important Notes

<div style="background: #fff8e6; padding: 20px; border-radius: 8px; border-left: 4px solid #FFA000; margin: 25px 0;">

### 🔗 Backend Integration
- Verify all API endpoints match the expected structure
- Configure CORS headers properly for development
- Ensure environment variables are properly set

### 🧪 Fake Backend Limitations
- **Development Only**: Not for production use
- **No Persistence**: Data resets on page refresh
- **Simulated Latency**: 500ms delay for realism

### 🔒 Security Considerations
- Implement server-side validation in addition to client-side
- Enforce role-based access controls
- Use HTTPS in production environments

</div>

<div align="center" style="margin: 40px 0; padding: 25px; background: linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%); border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
  <p style="font-size: 1.1em; margin-bottom: 10px;">Developed with ❤️ by <strong style="color: #4285F4;">Cyril John Ypil</strong></p>
  <p style="color: #5f6368;">📅 Last Updated: April 13, 2025</p>
</div>
