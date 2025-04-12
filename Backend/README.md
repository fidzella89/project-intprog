Full-Stack Application Backend (Node.js + MySQL Boilerplate)
Date: April 12, 2025
Project Type: Group Activity – Backend Full-Stack Development

📌 Introduction
This README outlines the backend architecture and development process for a full-stack application. The backend is built with Node.js, Express, Sequelize ORM, MySQL, and other supporting libraries. It features JWT-based authentication, account management, email verification, password reset, and Swagger API documentation.

📁 Project Structure
/
├── _helpers/
│   ├── db.js
│   ├── role.js
│   ├── send-email.js
│   ├── swagger.js
├── _middleware/
│   ├── authorize.js
│   ├── error-handler.js
│   ├── validate-request.js
├── accounts/
│   ├── account.model.js
│   ├── account.service.js
│   ├── accounts.controller.js
├── config.json
├── package.json
├── server.js


📦 Install Dependencies
npm install bcryptjs body-parser cookie-parser cors express-jwt express joi jsonwebtoken mysql2 nodemailer rootpath sequelize swagger-ui-express yamljs
npm install nodemon --save-dev

🧠 Key Components
🔹 MySQL Database Wrapper
Path: _helpers/db.js
Connects to the SQLyog server and initializes Sequelize. It also creates tables if they do not exist using sequelize.sync().

🔹 Role Enum
Path: _helpers/role.js
Defines user roles used throughout the application.

🔹 Send Email Helper
Path: _helpers/send-email.js
Sends account verification and password reset emails.

🔹 Swagger API Docs
Path: _helpers/swagger.js
Exposes Swagger documentation at /api-docs.

🛡️ Middleware
🔐 Authorize
Path: _middleware/authorize.js
Restricts route access based on user roles and JWT tokens.

⚠️ Global Error Handler
Path: _middleware/error-handler.js
Catches unhandled exceptions and prevents code duplication.

✅ Request Validator
Path: _middleware/validate-request.js
Validates incoming request bodies against Joi schemas.

📦 Sequelize Account Model
Path: /accounts/account.model.js
Defines the structure of the accounts table using Sequelize.

⚙️ Account Service
Path: /accounts/account.service.js
Handles:

Sign-up & email verification

JWT & refresh token authentication

Forgot/reset password

CRUD operations on account data

📡 Accounts Controller
Path: /accounts/accounts.controller.js
Defines all /accounts routes and connects them to service methods.

⚙️ Config
Path: /config.json
Contains:

DB connection options

JWT secret

Email sender address

SMTP settings

📋 Package Configuration
Path: /package.json
Includes scripts and dependencies for project setup.

🏁 Server Entry Point
Path: /server.js
Initializes middleware, routes, and starts the Express server.

🧪 API Testing with Postman
🔸 Register a New Account
Send POST to /accounts/register

Example body: { "email": "...", "password": "...", ... }

🔸 Verify Account
Use the token received via email to verify via /accounts/verify-email.

🔸 Forgot Password
Request a reset token via /accounts/forgot-password.

🔸 Reset Password
Use token to reset via /accounts/reset-password.

🔸 Authenticate
Login via /accounts/authenticate and check the Cookies tab for the refresh token.

🔸 Get All Accounts
Send GET to /accounts.

🔸 Update Account
Send PUT to /accounts/:id.

🔸 Refresh JWT Token
Use /accounts/refresh-token with your refresh token to get a new JWT.