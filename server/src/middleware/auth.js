/**
 * JWT authentication middleware.
 * Extracts the token from the Authorization header and attaches
 * the decoded user to req.user.
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret';

function authMiddleware(req, res, next) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ error: true, message: 'Authentication required. Please provide a valid token.' });
    }

    const token = header.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // { id, email, name }
        next();
    } catch (err) {
        return res.status(401).json({ error: true, message: 'Invalid or expired token.' });
    }
}

module.exports = authMiddleware;
