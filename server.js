const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();

// CORS configuration
const allowedOrigins = [
    'https://final-intprog-project-eqiv.onrender.com',
    'http://localhost:4200',
    'http://localhost:4000',
    'http://localhost:3000'
];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, postman)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Length', 'X-Refresh-Token'],
    credentials: true,
    optionsSuccessStatus: 200,
    maxAge: 86400
};

// Apply CORS before other middleware
app.use(cors(corsOptions));

// Other middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

// API routes without /api prefix
app.use('/accounts', require('./Backend/accounts/accounts.controller'));
app.use('/employees', require('./Backend/accounts/employees.controller'));
app.use('/departments', require('./Backend/accounts/departments.controller'));
app.use('/requests', require('./Backend/accounts/requests.controller'));
app.use('/workflows', require('./Backend/accounts/workflow.controller'));

// Serve static files from the Angular app
app.use(express.static(path.join(__dirname, 'dist/frontend')));

// For any other routes, return the Angular app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist/frontend/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    if (err.name === 'UnauthorizedError') {
        // JWT authentication error
        return res.status(401).json({ message: 'Invalid Token' });
    }

    // Log the error for debugging
    console.error('Error details:', err);

    // Determine appropriate error message based on error type
    let statusCode = 500;
    let errorMessage = 'An unexpected error occurred. Please try again later.';

    switch (true) {
        case typeof err === 'string':
            // Custom application error
            const is404 = err.toLowerCase().endsWith('not found');
            statusCode = is404 ? 404 : 400;
            errorMessage = err;
            break;

        case err.name === 'ValidationError':
            // Validation error
            statusCode = 400;
            errorMessage = err.message;
            break;
            
        case err.name === 'SequelizeForeignKeyConstraintError':
            // Foreign key constraint error
            statusCode = 400;
            errorMessage = 'The referenced employee or entity does not exist';
            break;

        case err.name === 'NotFoundError':
            // Not found error
            statusCode = 404;
            errorMessage = err.message || 'Resource not found';
            break;

        case err.name === 'InvalidTokenError':
            // Invalid token error
            statusCode = 401;
            errorMessage = err.message || 'Invalid token';
            break;
            
        case err.name === 'InvalidCredentialsError':
            // Invalid credentials error
            statusCode = 401;
            errorMessage = err.message || 'Invalid credentials';
            break;
            
        case err.name === 'InactiveAccountError':
            // Inactive account error
            statusCode = 403;
            errorMessage = err.message || 'Account is inactive. Contact the administrator.';
            break;
            
        case err.name === 'UnverifiedAccountError':
            // Unverified account error
            statusCode = 403;
            errorMessage = err.message || 'Email is not verified. Please check your email for the verification link or register again to receive a new verification link.';
            break;
            
        case err.status === 'Inactive':
            // Inactive account error
            statusCode = 403;
            errorMessage = 'Account is Inactive. Contact the administrator.';
            break;
    }

    res.status(statusCode).json({
        message: errorMessage,
        error: err,  // Include the full error object regardless of environment
        stack: err.stack,  // Include the stack trace for better debugging
        originalError: err.originalError || {}  // Include any wrapped original error
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('CORS enabled for:', corsOptions.origin);
}); 