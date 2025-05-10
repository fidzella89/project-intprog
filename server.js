const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();

// CORS configuration
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? [process.env.FRONTEND_URL || 'https://final-intprog-project-1.onrender.com']
        : ['http://localhost:4200', 'http://localhost:4000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
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

    // Default error
    console.error(err.stack);
    res.status(500).json({
        message: 'Something broke!',
        error: process.env.NODE_ENV === 'development' ? err.message : {}
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('CORS enabled for:', corsOptions.origin);
}); 