const jwt = require('express-jwt');
const { secret } = require('../config.json');
const db = require('../_helpers/db');

module.exports = authorize;

function authorize(roles = []) {
    // roles param can be a single role string (e.g. Role.User or 'User')
    // or an array of roles (e.g. [Role.Admin, Role.User] or ['Admin', 'User'])
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return [
        // authenticate JWT token and attach user to request object (req.user)
        jwt({ secret, algorithms: ['HS256'] }),

        // authorize based on user role
        async (req, res, next) => {
            try {
                const account = await db.Account.findByPk(req.user.id, {
                    include: [{
                        model: db.RefreshToken,
                        as: 'refreshTokens'
                    }]
                });

                if (!account || (roles.length && !roles.includes(account.role))) {
                    // account no longer exists or role not authorized
                    return res.status(401).json({ message: 'Unauthorized' });
                }

                // authentication and authorization successful
                req.user.role = account.role;
                req.user.ownsToken = token => !!account.refreshTokens?.find(x => x.token === token);
                next();
            } catch (error) {
                console.error('Authorization error:', error);
                return res.status(500).json({ message: 'Internal server error during authorization' });
            }
        }
    ];
}
