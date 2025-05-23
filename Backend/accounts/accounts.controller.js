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


module.exports = router;

function authenticateSchema(req, res, next) {
    const schema = Joi.object({
        email: Joi.string().required(),
        password: Joi.string().required()
    });
    validateRequest(req, next, schema);
}

function authenticate(req, res, next) {
    const { email, password } = req.body;
    const ipAddress = req.ip;
    
    // Log authentication attempt for debugging
    console.log(`Authentication attempt for email: ${email}`);
    
    accountService.authenticate({ email, password, ipAddress })
        .then(({ refreshToken, jwtToken, ...account }) => {
            if (!refreshToken || !jwtToken) {
                throw new Error('Invalid authentication response');
            }

            // Check account status before setting token
            if (account.status === 'Inactive') {
                return res.status(400).json({
                    message: 'Account is inactive. Please contact administrator.',
                    status: 'Inactive'
                });
            }
            
            // Set refresh token in cookie
            setTokenCookie(res, refreshToken);
            
            // Return account details and JWT token
            res.json({
                ...account,
                jwtToken,
                token: refreshToken
            });
        })
        .catch(error => {
            console.error('Authentication error details:', {
                name: error.name,
                message: error.message,
                errorType: error.errorType,
                status: error.status
            });
            
            if (error.name === 'ValidationError') {
                return res.status(400).json({ 
                    message: error.message,
                    errorType: 'validation',
                    error: {
                        name: error.name,
                        details: error
                    }
                });
            }
            
            if (error.name === 'InvalidCredentialsError') {
                // Make sure we're sending the right status code for credential errors
                return res.status(401).json({ 
                    message: error.message,
                    errorType: error.errorType || 'credentials',
                    error: {
                        name: error.name,
                        type: error.errorType,
                        details: error
                    }
                });
            }
            
            if (error.name === 'InactiveAccountError') {
                return res.status(403).json({ 
                    message: error.message,
                    status: error.status,
                    errorType: 'inactive',
                    error: {
                        name: error.name,
                        status: error.status,
                        details: error
                    }
                });
            }
            
            if (error.name === 'UnverifiedAccountError') {
                return res.status(403).json({ 
                    message: error.message,
                    status: error.status,
                    errorType: 'unverified',
                    canResendVerification: true,
                    error: {
                        name: error.name,
                        status: error.status,
                        details: error
                    }
                });
            }
            
            // Log unexpected errors
            console.error('Unexpected authentication error:', error);
            return res.status(500).json({ 
                message: error.message || 'An unexpected error occurred during authentication',
                error: process.env.NODE_ENV === 'development' ? error : undefined,
                errorType: 'server'
            });
        });
}

function refreshToken(req, res, next) {
    try {
        // The JWT token comes from the request body now
        const jwtToken = req.body?.token;
        
        if (!jwtToken) {
            return res.status(400).json({ 
                message: 'JWT token is required in request body',
                code: 'JWT_TOKEN_REQUIRED',
                debug: process.env.NODE_ENV === 'development' ? {
                    body: req.body
                } : undefined
            });
        }
        
    const ipAddress = req.ip;

        // Log debugging information
        console.log('Refresh Token Request:', {
            hasJwtToken: !!jwtToken,
            jwtToken: jwtToken
        });

        // We'll generate a new refresh token - no need to get it from the request
        accountService.refreshToken({ jwtToken, ipAddress })
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
                    domain: process.env.NODE_ENV === 'production' ? '.onrender.com' : undefined,
                    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                };

                res.cookie('refreshToken', refreshToken, cookieOptions);
                
                // Return the JWT token and account details
                res.json({
                    ...account,
                    jwtToken,
                    token: refreshToken
                });
            })
            .catch(error => {
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
                    case 'JwtError':
                        return res.status(401).json({ 
                            message: error.message,
                            code: 'JWT_INVALID'
                        });
                    default:
                        return res.status(500).json({ 
                            message: error.message || 'An error occurred while refreshing the token',
                            code: 'INTERNAL_ERROR',
                            debug: process.env.NODE_ENV === 'development' ? error : undefined
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
                stack: err.stack
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
    // Get the origin from the request headers
    const origin = req.get('origin');
    
    // Log registration attempt
    console.log(`Registration attempt for email: ${req.body.email}`);
    
    accountService.register(req.body, origin)
        .then(({ verificationToken }) => {
            // Always include verificationToken in response for the "Verify Now" button to work
            return res.status(200).json({
                message: 'Registration successful, please check your email for verification instructions',
                verificationToken: verificationToken
            });
        })
        .catch(error => {
            console.error('Registration error details:', {
                name: error.name,
                message: error.message,
                errorType: error.errorType
            });
            
            // Handle validation errors (including email exists)
            if (error.name === 'ValidationError') {
                return res.status(400).json({
                    message: error.message,
                    errorType: error.errorType || 'validation',
                    error: {
                        name: error.name,
                        type: error.errorType,
                        details: error
                    }
                });
            }
            
            // Handle other errors
            console.error('Unexpected registration error:', error);
            return res.status(500).json({
                message: 'An unexpected error occurred during registration',
                error: process.env.NODE_ENV === 'development' ? error : undefined,
                errorType: 'server'
            });
        });
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

    try {
        res.cookie('refreshToken', token, cookieOptions);
        console.log('Refresh token cookie set successfully');
    } catch (error) {
        console.error('Error setting refresh token cookie:', error);
        throw error;
    }
}