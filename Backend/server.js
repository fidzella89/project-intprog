const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const errorHandler = require('./_middleware/error-handler');

// Disable SSL verification for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser(process.env.COOKIE_SECRET || 'your-secret-key'));

// CORS configuration
const allowedOrigins = [
    'https://final-intprog-project-eqiv.onrender.com',
    'http://localhost:4200',
    'http://localhost:4000'
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
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept', 'Cookie'],
    exposedHeaders: ['Set-Cookie', 'Content-Length', 'X-Refresh-Token'],
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204
};

// Apply CORS configuration
app.use(cors(corsOptions));

// Add cookie security middleware
app.use((req, res, next) => {
    res.cookie = res.cookie.bind(res);
    const oldCookie = res.cookie;
    
    res.cookie = function (name, value, options = {}) {
        const secure = process.env.NODE_ENV === 'production';
        const sameSite = secure ? 'none' : 'lax';
        
        const defaultOptions = {
            httpOnly: true,
            secure: secure,
            sameSite: sameSite,
            path: '/',
            domain: process.env.NODE_ENV === 'production' ? '.onrender.com' : undefined
        };
        
        return oldCookie.call(this, name, value, { ...defaultOptions, ...options });
    };
    
    next();
});

// api routes
app.use('/accounts', require('./accounts/accounts.controller'));
app.use('/employees', require('./accounts/employees.controller'));
app.use('/requests', require('./accounts/requests.controller'));
app.use('/departments', require('./accounts/departments.controller'));
app.use('/workflows', require('./accounts/workflow.controller'));

// swagger docs route
app.use('/api-docs', require('./_helpers/swagger'));

// Serve static files from the Angular app
app.use(express.static(path.join(__dirname, '../frontend/dist/frontend')));

// Send all other requests to the Angular app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/frontend/index.html'));
});

// Add health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// global error handler
app.use(errorHandler);

// start server
const port = process.env.NODE_ENV === 'production' ? (process.env.PORT || 80) : 4000;

// Add error handling for the server
const server = app.listen(port, '0.0.0.0', () => {
    console.log('Server listening on port ' + port);
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('CORS enabled for:', allowedOrigins);
}).on('error', (err) => {
    console.error('Server failed to start:', err);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});
