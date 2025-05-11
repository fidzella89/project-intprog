const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('../_middleware/validate-request');
const authorize = require('../_middleware/authorize'); 
const Role = require('../_helpers/role');
const accountService = require('./account.service');

// routes
router.post('/authenticate', authenticateSchema, authenticate);
router.post('/refresh-token', refreshToken);
router.post('/revoke-token', authorize(), revokeTokenSchema, revokeToken);
router.post('/register', registerSchema, register);
router.post('/verify-email', verifyEmailSchema, verifyEmail);
router.post('/forgot-password', forgotPasswordSchema, forgotPassword);
router.post('/validate-reset-token', validateResetTokenSchema, validateResetToken);
router.post('/reset-password', resetPasswordSchema, resetPassword);
router.get('/', authorize(Role.Admin), getAll);
router.get('/:id', authorize(), getById);
router.post('/', authorize(Role.Admin), createSchema, create);
router.put('/:id', authorize(), updateSchema, update);
router.delete('/:id', authorize(), _delete);

// Add debug route for checking cookies
router.get('/check-cookies', (req, res) => {
    res.json({
        cookies: req.cookies,
        hasCookies: !!req.cookies,
        hasRefreshToken: !!req.cookies?.refreshToken,
        refreshTokenType: req.cookies?.refreshToken ? typeof req.cookies.refreshToken : 'undefined',
        isArray: Array.isArray(req.cookies?.refreshToken),
        headers: {
            cookie: req.headers?.cookie,
            authorization: req.headers?.authorization ? 'Present' : 'Not present'
        }
    });
});

module.exports = router;

function authenticateSchema(req, res, next) {
    const schema = Joi.object({
        email: Joi.string().required(),
        password: Joi.string().required()
    });
    validateRequest(req, next, schema);
}

function authenticate(req, res, next) {
    // Log the authentication request
    console.log(`Authentication request for email: ${req.body.email}`);
    
    const { email, password } = req.body;
    const ipAddress = req.ip;
    accountService.authenticate({ email, password, ipAddress })
        .then(({ refreshToken, ...account }) => {
            // Log the successful authentication
            console.log(`Generating JWT token for account ${account.id} with expiry ${account.jwtTokenExpiryTime || '15m'}`);
            console.log(`Generating refresh token for account ${account.id}:
            Token: ${refreshToken}
            Expires: ${account.refreshTokenExpiry || 'unknown'}
            IP: ${ipAddress}`);
            
            // Set refresh token in cookie
            setTokenCookie(res, refreshToken);
            
            // Return basic details, JWT token, and in dev mode, also return the refresh token
            const response = {
                ...account,
                refreshTokenCookie: !!refreshToken
            };
            
            // Include refresh token in development for debugging purposes
            if (process.env.NODE_ENV === 'development') {
                response.refreshToken = refreshToken;
            }
            
            // Send the response
            res.json(response);
        })
        .catch(error => {
            console.error('Authentication error:', error);
            
            // Handle specific error types
            if (error.name === 'InvalidCredentialsError') {
                return res.status(401).json({ 
                    message: error.message || 'Invalid credentials',
                    status: error.accountStatus
                });
            } else if (error.name === 'AccountLockedError') {
                return res.status(401).json({ 
                    message: error.message || 'Account is locked',
                    status: 'Locked'
                });
            } else if (error.name === 'AccountInactiveError') {
                return res.status(401).json({ 
                    message: error.message || 'Account is inactive',
                    status: 'Inactive'
                });
            }
            
            // Default error handler
            return res.status(500).json({ 
                message: 'An unexpected error occurred during authentication',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        });
}

function refreshToken(req, res, next) {
    try {
        // Log all request details for debugging
        console.log('Refresh Token Endpoint Called');
        console.log('Cookies:', JSON.stringify(req.cookies, null, 2));
        console.log('Headers:', JSON.stringify(req.headers, null, 2));
        console.log('Body:', JSON.stringify(req.body, null, 2));
        
        // Get all possible token sources
        const cookieToken = Array.isArray(req.cookies?.refreshToken) 
            ? req.cookies.refreshToken[req.cookies.refreshToken.length - 1] 
            : req.cookies?.refreshToken;
        
        const token = cookieToken || 
                     req.headers?.['x-refresh-token'] || 
                     req.body?.refreshToken;
        
        const ipAddress = req.ip;
        
        // Log debugging information
        console.log('Refresh Token Request:', {
            hasCookies: !!req.cookies,
            cookieToken: cookieToken,
            headerToken: req.headers?.['x-refresh-token'],
            bodyToken: req.body?.refreshToken,
            finalToken: token,
            cookieArray: Array.isArray(req.cookies?.refreshToken)
        });
        
        if (!token) {
            return res.status(401).json({ 
                message: 'Refresh token is required',
                code: 'TOKEN_REQUIRED',
                debug: process.env.NODE_ENV === 'development' ? {
                    cookies: req.cookies,
                    headers: req.headers
                } : undefined
            });
        }

        // Clear any existing refresh tokens before processing
        res.clearCookie('refreshToken', {
            path: '/',
            domain: process.env.NODE_ENV === 'production' ? '.onrender.com' : undefined
        });

        accountService.refreshToken({ token, ipAddress })
            .then(({ jwtToken, refreshToken, ...account }) => {
                if (!jwtToken || !refreshToken) {
                    throw new Error('Invalid token response from service');
                }

                // Set the new refresh token cookie with specific options
                const cookieOptions = {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                    path: '/',
                    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                };

                // In development, don't set domain to ensure cookies work on localhost
                if (process.env.NODE_ENV === 'production') {
                    cookieOptions.domain = '.onrender.com';
                }

                // Log cookie setting
                console.log('Setting new refresh token cookie with options:', {
                    ...cookieOptions,
                    tokenLength: refreshToken.length
                });

                res.cookie('refreshToken', refreshToken, cookieOptions);
                
                // Also add the token as a header for clients that can't use cookies
                res.setHeader('X-Refresh-Token', refreshToken);
                
                // Return the JWT token and account details
                res.json({
                    ...account,
                    jwtToken,
                    refreshToken: process.env.NODE_ENV === 'development' ? refreshToken : undefined // Include refreshToken in dev for debugging
                });
            })
            .catch(error => {
                // Clear all refresh tokens on error
                const cookieOptions = {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                    path: '/',
                    domain: process.env.NODE_ENV === 'production' ? '.onrender.com' : undefined
                };
                
                res.clearCookie('refreshToken', cookieOptions);
                
                // Log the error for debugging
                console.error('Refresh token error:', error);

                // Handle specific error types
                switch(error.name) {
                    case 'ValidationError':
                        return res.status(400).json({ 
                            message: error.message,
                            code: 'VALIDATION_ERROR'
                        });
                    case 'NotFoundError':
                        return res.status(404).json({ 
                            message: error.message,
                            code: 'TOKEN_NOT_FOUND'
                        });
                    case 'InvalidTokenError':
                        return res.status(401).json({ 
                            message: error.message,
                            code: 'TOKEN_INVALID'
                        });
                    case 'TokenGenerationError':
                        return res.status(500).json({ 
                            message: error.message,
                            code: 'TOKEN_GENERATION_ERROR'
                        });
                    default:
                        return res.status(500).json({ 
                            message: error.message || 'An error occurred while refreshing the token',
                            code: 'INTERNAL_ERROR',
                            debug: process.env.NODE_ENV === 'development' ? {
                                error: error.message,
                                stack: error.stack,
                                cookies: req.cookies
                            } : undefined
                        });
                }
            });
    } catch (err) {
        console.error('Unexpected error in refresh token endpoint:', err);
        return res.status(500).json({ 
            message: 'An error occurred while processing your request',
            code: 'INTERNAL_ERROR',
            debug: process.env.NODE_ENV === 'development' ? {
                error: err.message,
                stack: err.stack,
                cookies: req.cookies
            } : undefined
        });
    }
}

function revokeTokenSchema(req, res, next) {
    const schema = Joi.object({
        token: Joi.string().empty('')
    });
    validateRequest(req, next, schema);
}

function revokeToken(req, res, next) {
    // accept token from request body or cookie
    const token = req.body.token || req.cookies.refreshToken;
    const ipAddress = req.ip;

    if (!token) return res.status(400).json({ message: 'Token is required' });

    // users can revoke their own tokens and admins can revoke any tokens
    if (!req.user.ownsToken(token) && req.user.role !== Role.Admin) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    accountService.revokeToken({ token, ipAddress })
        .then(() => res.json({ message: 'Token revoked' }))
        .catch(next);
}

function registerSchema(req, res, next) {
    const schema = Joi.object({
        title: Joi.string().required(),
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
        acceptTerms: Joi.boolean().valid(true).required()
    });
    validateRequest(req, next, schema);
}

function register(req, res, next) {
    accountService.register(req.body, req.get('origin'))
        .then((result) => {
            if (result && result.verificationToken) {
                // Get the base URL dynamically
                const baseUrl = req.protocol + '://' + req.get('host');
                res.json({ 
                    message: 'Registration successful, please check your email for verification instructions',
                    verificationToken: result.verificationToken,
                    // URL for frontend
                    verificationUrl: `${req.get('origin') || baseUrl}/account/verify-email?token=${result.verificationToken}`,
                    // Direct API URL
                    verificationApiUrl: `${baseUrl}/accounts/verify-email`,
                    note: "POST to the verificationApiUrl with body: { \"token\": \"your-token\" }"
                });
            } else {
                res.json({ message: 'Registration successful, please check your email for verification instructions' });
            }
        })
        .catch(next);
}

function verifyEmailSchema(req, res, next) {
    const schema = Joi.object({
        token: Joi.string().required()
    });
    validateRequest(req, next, schema);
}

function verifyEmail(req, res, next) {
    accountService.verifyEmail(req.body)
        .then(() => res.json({ message: 'Verification successful, you can now login' }))
        .catch(next);
}

function forgotPasswordSchema(req, res, next) {
    const schema = Joi.object({
        email: Joi.string().email().required()
    });
    validateRequest(req, next, schema);
}

function forgotPassword(req, res, next) {
    accountService.forgotPassword(req.body, req.get('origin'))
        .then(() => res.json({ message: 'Please check your email for password reset instructions' }))
        .catch(next);
}

function validateResetTokenSchema(req, res, next) {
    const schema = Joi.object({
        token: Joi.string().required()
    });
    validateRequest(req, next, schema);
}

function validateResetToken(req, res, next) {
    accountService.validateResetToken(req.body)
        .then(() => res.json({ message: 'Token is valid' }))
        .catch(next);
}

function resetPasswordSchema(req, res, next) {
    const schema = Joi.object({
        token: Joi.string().required(),
        password: Joi.string().min(6).required(),
        confirmPassword: Joi.string().valid(Joi.ref('password')).required()
    });
    validateRequest(req, next, schema);
}

function resetPassword(req, res, next) {
    accountService.resetPassword(req.body)
        .then(() => res.json({ message: 'Password reset successful, you can now login' }))
        .catch(next);
}

function getAll(req, res, next) {
    accountService.getAll()
        .then(accounts => res.json(accounts))
        .catch(next);
}

function getById(req, res, next) {
    // users can get their own account and admins can get any account
    if (Number(req.params.id) !== req.user.id && req.user.role !== Role.Admin) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    accountService.getById(req.params.id)
        .then(account => account ? res.json(account) : res.sendStatus(404))
        .catch(next);
}

function createSchema(req, res, next) {
    const schema = Joi.object({
        title: Joi.string().required(),
        firstName: Joi.string().required(),
        lastName: Joi.string().required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
        role: Joi.string().valid(Role.Admin, Role.User).default(Role.User),
        status: Joi.string().valid('Active', 'Inactive').default('Inactive')
    });
    validateRequest(req, next, schema);
}

function create(req, res, next) {
    accountService.create(req.body)
        .then(account => res.json(account))
        .catch(next);
}

function updateSchema(req, res, next) {
    const schemaRules = {
        title: Joi.string().empty(''),
        firstName: Joi.string().empty(''),
        lastName: Joi.string().empty(''),
        email: Joi.string().email().empty(''),
        password: Joi.string().min(6).empty(''),
        confirmPassword: Joi.string().valid(Joi.ref('password')).empty(''),
        status: Joi.string().valid('Active', 'Inactive').empty('')
    };

    // only admins can update role
    if (req.user.role === Role.Admin) {
        schemaRules.role = Joi.string().valid(Role.Admin, Role.User).empty('');
    }

    const schema = Joi.object(schemaRules).with('password', 'confirmPassword');
    validateRequest(req, next, schema);
}

function update(req, res, next) {
    // users can update their own account and admins can update any account
    if (Number(req.params.id) !== req.user.id && req.user.role !== Role.Admin) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    accountService.update(req.params.id, req.body)
        .then(account => res.json(account))
        .catch(next);
}

function _delete(req, res, next) {
    // users can delete their own account and admins can delete any account
    if (Number(req.params.id) !== req.user.id && req.user.role !== Role.Admin) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    accountService.delete(req.params.id)
        .then(() => res.json({ message: 'Account deleted successfully' }))
        .catch(next);
}

// helper functions
function setTokenCookie(res, token) {
    if (!token) {
        console.error('Attempted to set cookie with empty token');
        throw new Error('Invalid token provided');
    }
    
    // create cookie with refresh token that expires in 7 days
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        path: '/'
    };

    // In development, don't set domain to ensure cookies work on localhost
    if (process.env.NODE_ENV === 'production') {
        cookieOptions.domain = '.onrender.com';
    }

    try {
        // Log the complete cookie options
        console.log('Setting refresh token cookie with options:', cookieOptions);
        console.log('Token length:', token.length);
        
        // Clear any existing cookies first
        res.clearCookie('refreshToken', {
            path: '/',
            domain: process.env.NODE_ENV === 'production' ? '.onrender.com' : undefined
        });
        
        res.cookie('refreshToken', token, cookieOptions);
        console.log('Refresh token cookie set successfully');
    } catch (error) {
        console.error('Error setting refresh token cookie:', error);
        throw error;
    }
}