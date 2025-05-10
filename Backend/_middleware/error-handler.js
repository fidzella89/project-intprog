module.exports = errorHandler;

function errorHandler(err, req, res, next) {
    // Log the error for debugging
    console.error('Error details:', {
        name: err.name,
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });

    switch (true) {
        case typeof err === 'string':
            // custom application error
            const is404 = err.toLowerCase().endsWith('not found');
            const statusCode = is404 ? 404 : 400;
            return res.status(statusCode).json({ message: err });

        case err.name === 'UnauthorizedError':
            // jwt authentication error
            return res.status(401).json({ message: 'Unauthorized' });

        case err.name === 'ValidationError':
            // validation error
            return res.status(400).json({ message: err.message });

        case err.name === 'NotFoundError':
            // not found error
            return res.status(404).json({ message: err.message });

        case err.name === 'InvalidTokenError':
            // invalid token error
            return res.status(401).json({ 
                message: err.message,
                requiresLogin: true
            });

        case err.name === 'InternalError':
            // internal server error
            return res.status(500).json({ 
                message: err.message,
                error: process.env.NODE_ENV === 'development' ? err : {}
            });

        default:
            // unexpected error
            console.error('Unhandled error:', err);
            return res.status(500).json({ 
                message: 'An unexpected error occurred',
                error: process.env.NODE_ENV === 'development' ? err : {}
            });
    }
}
