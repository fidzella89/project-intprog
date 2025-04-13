# Front-End User Management App 🚀

This project is an Angular-based front-end application for user management. It includes features such as user registration, email verification, authentication, password reset, and profile updates. The project is built with Angular 10 and styled using Bootstrap.

---

## Table of Contents 📚
- [Overview](#overview-)
- [Features](#features-)
- [Technologies Used](#technologies-used-)
- [File and Folder Structure](#file-and-folder-structure-)
- [Setup and Installation](#setup-and-installation-)
- [Usage](#usage-)
- [Implementation Details](#implementation-details-)
- [Screenshots](#screenshots-)
- [License](#license-)
- [Notes](#notes-)
- [Author](#author-)

---

## Overview 📖

The Front-End User Management App is a fully functional Angular application designed to manage user accounts. It provides a seamless user experience for registration, authentication, profile updates, and password management. The app is built with a modular architecture, making it scalable and maintainable.

---

## Features ✨
- 📝 **User Registration**: Allows users to create an account.
- 📧 **Email Verification**: Confirms user identity via email.
- 🔐 **Authentication**: Login and logout functionality.
- 🔑 **Password Reset**: Handles forgotten passwords.
- 🛠️ **Profile Management**: Update user details and delete accounts.
- 📱 **Responsive Design**: Built with Bootstrap for mobile-friendly layouts.
- ❌ **Error Handling**: Displays validation and server-side errors.

---

## Technologies Used 🛠️
- **Angular 10** (Framework)
- **Bootstrap 4.5** (Styling)
- **RxJS** (Reactive programming)
- **TypeScript** (Type-safe JavaScript)
- **HTML/CSS** (UI structure and styling)
- **Zone.js** (Change detection)

---

## File and Folder Structure 📂

```bash
src/
├── app/
│   ├── _helpers/              # Custom helper functions (e.g., validators)
│   │   └── must-match.validator.ts
│   ├── _services/             # Services for API calls and alerts
│   │   ├── account.service.ts
│   │   └── alert.service.ts
│   ├── auth/                  # Components for authentication
│   │   ├── login/
│   │   │   ├── login.component.ts
│   │   │   └── login.component.html
│   │   └── register/
│   │       ├── register.component.ts
│   │       └── register.component.html
│   ├── profile/               # Components for user profile management
│   │   └── update/
│   │       ├── update.component.ts
│   │       └── update.component.html
│   ├── app.module.ts          # Main application module
│   └── app.component.ts       # Root component
├── assets/                    # Static assets
├── environments/              # Environment-specific configurations
│   ├── environment.ts
│   └── environment.prod.ts
├── index.html                 # Main HTML file
├── styles.css                 # Global styles
├── angular.json               # Angular CLI configuration
```

---

## Setup and Installation ⚙️

### Prerequisites
- Node.js (v14 or higher)
- Angular CLI (v10 or higher)
- Git (optional)

### Steps
1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-repo/front-end-user-management-app.git
   cd front-end-user-management-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npx ng serve
   ```

4. **Open the app in your browser**:
   ```
   http://localhost:4200
   ```

---

## Usage 🖥️

### Running the Application
```bash
npx ng serve
```
Open the application in your browser at: `http://localhost:4200`

### Key Features
- **Register**: Create a new user account.
- **Login**: Authenticate with email and password.
- **Profile Update**: Modify user details.
- **Delete Account**: Permanently remove the user account.

---

## Implementation Details 🔍

### 1. Authentication
- **Login**: `login.component.ts` sends credentials to the backend API.
- **Register**: `register.component.ts` validates input and registers users.

### 2. Profile Management
- **Update Profile**: `update.component.ts` allows editing details using Reactive Forms.
- **Delete Account**: `onDelete()` method deletes user account after confirmation.

### 3. Validation
- **Custom Validators**: `must-match.validator.ts` ensures passwords match.
- **Form Validation**: All forms use Reactive Forms for validation.

### 4. Error Handling
- **Alert Service**: `alert.service.ts` shows success/error messages.
- **Validation Errors**: Displayed inline in the forms.

---

## Screenshots 📸

- **Login Page**: Login Page Screenshot <!-- [ ] Insert screenshot here -->
- **Signup Page**: Signup Page Screenshot <!-- [ ] Insert screenshot here -->
- **Email Verification Page**: Email Verification Screenshot <!-- [ ] Insert screenshot here -->
- **Profile Update Page**: Profile Update Screenshot <!-- [ ] Insert screenshot here -->
- **Error Handling**: Error Handling Screenshot <!-- [ ] Insert screenshot here -->

---

## License 📜

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

---

## Notes 📝
- Ensure the backend API is running and accessible.
- Test the application thoroughly for edge cases and error handling.

---

## Author ✍️
Developed by **Ypil** and **Doblas**.

