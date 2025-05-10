const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();

// CORS configuration
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? [process.env.FRONTEND_URL || 'https://your-app.netlify.app']
        : ['http://localhost:4200'],
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
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

// API routes prefix
const apiRouter = express.Router();

// Authentication routes
apiRouter.post('/accounts/authenticate', (req, res) => {
    try {
        // Temporary authentication logic
        const { email, password } = req.body;
        if (email && password) {
            res.json({
                id: '1',
                email: email,
                token: 'dummy-token'
            });
        } else {
            res.status(400).json({ message: 'Email and password are required' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Mount API routes under /api
app.use('/api', apiRouter);

// Serve static files from the Angular app
app.use(express.static(path.join(__dirname, 'dist/frontend')));

// For any other routes, return the Angular app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist/frontend/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
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