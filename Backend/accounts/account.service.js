const config = require('../config.json');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Op } = require('sequelize');
const sendEmail = require('../_helpers/send-email');
const db = require('../_helpers/db');
const Role = require('../_helpers/role');

module.exports = {
    authenticate,
    refreshToken,
    revokeToken,
    register,
    verifyEmail,
    forgotPassword,
    validateResetToken,
    resetPassword,
    getAll,
    getById,
    create,
    update,
    delete: _delete
};

async function authenticate({ email, password, ipAddress }) {
    try {
        const account = await db.Account.scope('withHash').findOne({ 
            where: { email },
            include: [{
                model: db.RefreshToken,
                where: { revoked: null },
                required: false
            }]
        });

    if (!account) {
            throw { 
                name: 'InvalidCredentialsError', 
                message: 'Email does not exist',
                errorType: 'email'
            };
    }

    if (!account.isVerified) {
            throw { 
                name: 'UnverifiedAccountError', 
                message: 'Email is not verified. Please check your email for the verification link or register again to receive a new verification link.',
                status: 'Unverified'
            };
    }

    if (account.status === 'Inactive') {
            throw { 
                name: 'InactiveAccountError', 
                message: 'Account is inactive. Please contact administrator.',
                status: 'Inactive'
            };
    }

    if (!(await bcrypt.compare(password, account.passwordHash))) {
            throw { 
                name: 'InvalidCredentialsError', 
                message: 'Password is incorrect',
                errorType: 'password'
            };
    }

        // Revoke any existing active refresh tokens
        if (account.RefreshTokens && account.RefreshTokens.length) {
            await db.RefreshToken.update(
                { revoked: Date.now(), revokedByIp: ipAddress },
                { where: { accountId: account.id, revoked: null } }
            );
        }

        // Generate new tokens
    const jwtToken = generateJwtToken(account);
    const refreshToken = generateRefreshToken(account, ipAddress);

        // Save refresh token
    await refreshToken.save();

        // Return basic details and tokens
    return {
        ...basicDetails(account),
        jwtToken,
        refreshToken: refreshToken.token
    };
    } catch (error) {
        console.error('Authentication error:', error);
        throw error;
    }
}

async function refreshToken({ jwtToken, ipAddress }) {
    try {
        // Validate JWT token
        if (!jwtToken) {
            throw {
                name: 'ValidationError',
                message: 'JWT token is required'
            };
        }

        // Extract account ID from JWT token
        let accountId;
        try {
            const decoded = jwt.verify(jwtToken, config.secret);
            accountId = decoded.id;
        } catch (err) {
            throw {
                name: 'JwtError',
                message: 'Invalid JWT token'
            };
        }

        // Find the account
        const account = await db.Account.findByPk(accountId);
        
        if (!account) {
            throw {
                name: 'NotFoundError',
                message: 'Account not found'
            };
        }

        // Check account status
        if (account.status === 'Inactive') {
            throw {
                name: 'ValidationError',
                message: 'Account is inactive'
            };
        }

        // Generate new tokens
        const newJwtToken = generateJwtToken(account);
        const newRefreshToken = generateRefreshToken(account, ipAddress);
        
        if (!newRefreshToken || !newJwtToken) {
            throw new Error('Failed to generate new tokens');
        }
        
        // Revoke old refresh tokens for this account
        await db.RefreshToken.update(
            { revoked: Date.now(), revokedByIp: ipAddress },
            { where: { accountId: account.id, revoked: null } }
        );
        
        // Save new refresh token
        await newRefreshToken.save();

        // Return response with both tokens
        return {
        ...basicDetails(account),
            jwtToken: newJwtToken,
        refreshToken: newRefreshToken.token
    };
    } catch (error) {
        console.error('Refresh token error:', error);
        throw error;
    }
}

async function revokeToken({ token, ipAddress }) {
    const refreshToken = await getRefreshToken(token);

    // revoke token and save
    refreshToken.revoked = Date.now();
    refreshToken.revokedByIp = ipAddress;
    await refreshToken.save();
}

async function register(params, origin) {
    // validate
    if (await db.Account.findOne({ where: { email: params.email } })) {
        // Return an error for the API rather than silently sending an email
        if (origin) {
            // For web requests, throw a proper error
            throw {
                name: 'ValidationError',
                message: 'Email already exists. Please use a different email address or try to login.',
                errorType: 'email'
            };
        } else {
            // For non-web requests or migrations, just send the email
            return await sendAlreadyRegisteredEmail(params.email, origin);
        }
    }

    // create account object
    const account = new db.Account(params);

    // first registered account is an admin and active, others are user and inactive
    const isFirstAccount = (await db.Account.count()) === 0;
    account.role = isFirstAccount ? Role.Admin : Role.User;
    account.status = isFirstAccount ? 'Active' : 'Inactive';
    account.verificationToken = randomTokenString();

    // hash password
    account.passwordHash = await hash(params.password);

    // save account
    await account.save();

    // send email
    await sendVerificationEmail(account, origin);
    
    // return verification token for development purposes
    return { verificationToken: account.verificationToken };
}

async function verifyEmail({ token }) {
    const account = await db.Account.findOne({ where: { verificationToken: token } });

    if (!account) throw 'Verification failed';

    account.verified = Date.now();
    account.verificationToken = null;
    await account.save();
}

async function forgotPassword({ email }, origin) {
    const account = await db.Account.findOne({ where: { email } });

    // always return ok response to prevent email enumeration
    if (!account) return;

    // create reset token that expires after 24 hours
    account.resetToken = randomTokenString();
    account.resetTokenExpires = new Date(Date.now() + 24*60*60*1000);
    await account.save();

    // send email
    await sendPasswordResetEmail(account, origin);
}

async function validateResetToken({ token }) {
    const account = await db.Account.findOne({
        where: {
            resetToken: token,
            resetTokenExpires: { [Op.gt]: Date.now() }
        }
    });

    if (!account) throw 'Invalid token';

    return account;
}

async function resetPassword({ token, password }) {
    const account = await validateResetToken({ token });

    // update password and remove reset token
    account.passwordHash = await hash(password);
    account.passwordReset = Date.now();
    account.resetToken = null;
    account.resetTokenExpires = null;
    await account.save();
}

async function getAll() {
    const accounts = await db.Account.findAll();
    return accounts.map(x => basicDetails(x));
}

async function getById(id) {
    const account = await getAccount(id);
    return basicDetails(account);
}

async function create(params) {
    // validate
    if (await db.Account.findOne({ where: { email: params.email } })) {
        throw 'Email "' + params.email + '" is already registered';
    }

    // set default values
    params.role = params.role || Role.User;
    params.status = params.status || 'Inactive';

    const account = new db.Account(params);
    account.verified = Date.now();

    // hash password
    account.passwordHash = await hash(params.password);

    // save account
    await account.save();

    return basicDetails(account);
}

async function update(id, params) {
    const account = await getAccount(id);

    // validate (if email was changed)
    if (params.email && account.email !== params.email && await db.Account.findOne({ where: { email: params.email } })) {
        throw 'Email "' + params.email + '" is already taken';
    }

    // hash password if it was entered
    if (params.password) {
        params.passwordHash = await hash(params.password);
    }

    // copy params to account and save
    Object.assign(account, params);
    account.updated = Date.now();
    await account.save();

    return basicDetails(account);
}

async function _delete(id) {
    const account = await getAccount(id);
    await account.destroy();
}

// helper functions

async function getAccount(id) {
    const account = await db.Account.findByPk(id);
    if (!account) throw 'Account not found';
    return account;
}

async function getRefreshToken(token) {
    if (!token) {
        throw {
            name: 'ValidationError',
            message: 'Refresh token is required'
        };
    }

    const refreshToken = await db.RefreshToken.findOne({ where: { token } });
    
    if (!refreshToken) {
        throw {
            name: 'NotFoundError',
            message: 'Refresh token not found'
        };
    }
    
    if (!refreshToken.isActive) {
        throw {
            name: 'InvalidTokenError',
            message: 'Refresh token has expired or been revoked'
        };
    }
    
    return refreshToken;
}

async function hash(password) {
    return await bcrypt.hash(password, 10);
}

function generateJwtToken(account) {
    try {
        // Validate account
        if (!account || !account.id) {
            throw new Error('Invalid account provided to generateJwtToken');
        }

        // Create a JWT token that expires in 15 minutes
        const expiresIn = '15m';
        console.log(`Generating JWT token for account ${account.id} with expiry ${expiresIn}`);
        
        const token = jwt.sign(
            { 
                sub: account.id, 
                id: account.id,
                role: account.role,
                // Add timestamp to ensure unique tokens
                iat: Math.floor(Date.now() / 1000)
            }, 
            config.secret, 
            { expiresIn }
        );
        
        return token;
    } catch (error) {
        console.error('Error generating JWT token:', error);
        throw {
            name: 'TokenGenerationError',
            message: 'Failed to generate JWT token'
        };
    }
}

function generateRefreshToken(account, ipAddress) {
    try {
        // Ensure we have a valid account object
        if (!account || !account.id) {
            throw new Error('Invalid account provided to generateRefreshToken');
        }
        
        // Create a refresh token that expires in 7 days
        const token = randomTokenString();
        const expires = new Date(Date.now() + 7*24*60*60*1000);
        
        console.log(`Generating refresh token for account ${account.id}:
            Token: ${token}
            Expires: ${expires.toISOString()}
            IP: ${ipAddress}`
        );
        
        const refreshToken = new db.RefreshToken({
        accountId: account.id,
            token: token,
            expires: expires,
        createdByIp: ipAddress
    });

        if (!refreshToken || !refreshToken.token) {
            throw new Error('Failed to create refresh token');
        }

        return refreshToken;
    } catch (error) {
        console.error('Error generating refresh token:', error);
        throw {
            name: 'TokenGenerationError',
            message: 'Failed to generate refresh token'
        };
    }
}

function randomTokenString() {
    return crypto.randomBytes(40).toString('hex');
}

function basicDetails(account) {
    const { id, title, firstName, lastName, email, role, created, updated, isVerified, status } = account;
    return { id, title, firstName, lastName, email, role, created, updated, isVerified, status };
}

async function sendVerificationEmail(account, origin) {
    let message;
    if (origin) {
        const verifyUrl = `${origin}/account/verify-email?token=${account.verificationToken}`;
        message = `<p>Please click the below link to verify your email address:</p>
                   <p><a href="${verifyUrl}">${verifyUrl}</a></p>`;
    } else {
        message = `<p>Please use the below token to verify your email address with the <code>/account/verify-email</code> api route:</p>
                   <p><code>${account.verificationToken}</code></p>`;
    }

    await sendEmail({
        to: account.email,
        subject: 'Sign-up Verification API - Verify Email',
        html: `<h4>Verify Email</h4>
               <p>Thanks for registering!</p>
               ${message}`
    });
}

async function sendAlreadyRegisteredEmail(email, origin) {
    let message;
    if (origin) {
        message = `<p>If you don't know your password please visit the <a href="${origin}/account/forgot-password">forgot password</a> page.</p>`;
    } else {
        message = `<p>If you don't know your password you can reset it via the <code>/account/forgot-password</code> api route.</p>`;
    }

    await sendEmail({
        to: email,
        subject: 'Sign-up Verification API - Email Already Registered',
        html: `<h4>Email Already Registered</h4>
               <p>Your email <strong>${email}</strong> is already registered.</p>
               ${message}`
    });
}

async function sendPasswordResetEmail(account, origin) {
    let message;
    if (origin) {
        const resetUrl = `${origin}/account/reset-password?token=${account.resetToken}`;
        message = `<p>Please click the below link to reset your password, the link will be valid for 1 day:</p>
                   <p><a href="${resetUrl}">${resetUrl}</a></p>`;
    } else {
        message = `<p>Please use the below token to reset your password with the <code>/account/reset-password</code> api route:</p>
                   <p><code>${account.resetToken}</code></p>`;
    }

    await sendEmail({
        to: account.email,
        subject: 'Sign-up Verification API - Reset Password',
        html: `<h4>Reset Password Email</h4>
               ${message}`
    });
}

// Add this new diagnostic function
async function checkActiveTokens() {
    try {
        const allTokens = await db.RefreshToken.findAll({
            where: {
                revoked: null
            },
            limit: 10
        });
        
        console.log(`Found ${allTokens.length} active refresh tokens`);
        
        if (allTokens.length > 0) {
            // Show details of the first few tokens
            allTokens.slice(0, 3).forEach(token => {
                console.log(`Token ID: ${token.id}, Account ID: ${token.accountId}, Expires: ${token.expires}`);
            });
        }
    } catch (error) {
        console.error('Error checking active tokens:', error);
    }
}
