require('rootpath')();
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const errorHandler = require('_middleware/error-handler');

// Disable SSL verification for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

// CORS configuration
const allowedOrigins = [
    'https://final-intprog-project-1.onrender.com',
    'http://localhost:4200',
    'http://localhost:4000'
];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, postman)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Length', 'X-Refresh-Token'],
    maxAge: 86400
};

// Apply CORS configuration
app.use(cors(corsOptions));

// api routes
app.use('/accounts', require('./accounts/accounts.controller'));
app.use('/employees', require('./accounts/employees.controller'));
app.use('/requests', require('./accounts/requests.controller'));
app.use('/departments', require('./accounts/departments.controller'));
app.use('/workflows', require('./accounts/workflow.controller'));

// swagger docs route
app.use('/api-docs', require('_helpers/swagger'));

// Serve static files from the Angular app
app.use(express.static(path.join(__dirname, '../frontend/dist/frontend')));

// Send all other requests to the Angular app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/frontend/index.html'));
});

// global error handler
app.use(errorHandler);

// start server
const port = process.env.NODE_ENV === 'production' ? (process.env.PORT || 80) : 4000;
app.listen(port, '0.0.0.0', () => {
    console.log('Server listening on port ' + port);
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('CORS enabled for:', allowedOrigins);
});
