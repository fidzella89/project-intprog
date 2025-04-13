# 🚀 Full-Stack Application Backend  
**Node.js + MySQL Boilerplate**  
📅 *Last Updated: April 12, 2025*  
👥 *Group Activity – Backend Full-Stack Development*

<div align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL">
  <img src="https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=JSON%20web%20tokens&logoColor=white" alt="JWT">
  <img src="https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black" alt="Swagger">
</div>

## 📌 Introduction  
A robust backend system featuring:  
🔐 **JWT Authentication** (with refresh tokens)  
📧 **Email Verification & Password Reset**  
👥 **Role-Based Access Control**  
📚 **Auto-Generated API Documentation**  
🛠️ **CRUD Operations** with Sequelize ORM  

---

## 🏗️ Project Structure

```bash
backend/
├── _helpers/            # Core utilities
│   ├── db.js            # Database connector
│   ├── role.js          # Role definitions
│   ├── send-email.js    # Email service
│   └── swagger.js       # API documentation
│
├── _middleware/         # Express middleware
│   ├── authorize.js     # Route protection
│   ├── error-handler.js # Global error handling
│   └── validate-request.js # Request validation
│
├── accounts/            # Account management
│   ├── account.model.js # Sequelize model
│   ├── account.service.js # Business logic
│   └── accounts.controller.js # Routes
│
├── config.json          # Environment config
├── package.json         # Dependencies
└── server.js            # Application entry
```
🛠️ Setup & Installation

# Install production dependencies
```bash
npm install bcryptjs body-parser cookie-parser cors express \
express-jwt joi jsonwebtoken mysql2 nodemailer sequelize \
swagger-ui-express yamljs
```

# Install development tools
```bash
npm install nodemon --save-dev
```

# Start development server
```bash
npm run dev
```
🔑 Core Components
🗃️ Database Layer
File	Purpose
db.js	MySQL connection via Sequelize
account.model.js	Account schema definition
🔐 Security
Middleware	Functionality
authorize.js	Role-based route protection
validate-request.js	Request payload validation
✉️ Email Services
```javascript
// Example from send-email.js
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
```
📚 API Documentation
Access Swagger UI at http://localhost:4000/api-docs
Swagger UI Preview

🧪 API Testing Guide
🔐 Authentication Flow
Register → POST /accounts/register

```json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```
Verify Email → POST /accounts/verify-email (with token)

Login → POST /accounts/authenticate

🔄 Token Management
Endpoint	Purpose
/refresh-token	Get new JWT
/revoke-token	Invalidate refresh token
👥 Account Management
http
Copy
GET /accounts/{id}
Authorization: Bearer {jwt}
⚠️ Troubleshooting
Error	Solution
SequelizeConnectionError	Verify MySQL credentials in config.json
JWTExpired	Use /refresh-token endpoint
EmailNotSent	Check SMTP settings
<div align="center" style="margin-top: 40px; padding: 20px; background: #f8f9fa; border-radius: 8px;"> <p>Developed with ❤️ by <strong>Wenceslao and Montemar</strong></p></div> 
