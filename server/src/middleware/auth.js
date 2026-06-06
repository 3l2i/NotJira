import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { cognitoConfig } from '../config/cognito.js';

// ─── JWKS Client (caches signing keys for 10 minutes) ───
const client = jwksClient({
  jwksUri: cognitoConfig.jwksUri,
  cache: true,
  cacheMaxAge: 600000, // 10 minutes
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

/**
 * Retrieves the signing key from Cognito's JWKS endpoint
 */
function getSigningKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

/**
 * Authentication middleware — validates Cognito JWT on every request.
 * Extracts user info (userId, email, role, teamId) from the token
 * and attaches it to req.user.
 *
 * ⚠️ CRITICAL: Every route except /api/health MUST use this middleware.
 */
export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Missing or malformed Authorization header. Expected: Bearer <token>',
    });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(
    token,
    getSigningKey,
    {
      issuer: cognitoConfig.issuer,
      algorithms: ['RS256'],
    },
    (err, decoded) => {
      if (err) {
        console.error('JWT verification failed:', err.message);
        return res.status(401).json({
          error: 'Invalid token',
          message: 'Token is invalid or expired. Please sign in again.',
        });
      }

      // Attach user context from the validated Cognito token
      req.user = {
        userId: decoded.sub,
        email: decoded.email,
        role: decoded['custom:role'] || 'employee',
        teamId: decoded['custom:teamId'] || null,
        name: decoded.name || decoded.email,
      };

      next();
    }
  );
};

/**
 * Role-based authorization middleware.
 * Usage: requireRole('manager') or requireRole('manager', 'admin')
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `This action requires one of the following roles: ${roles.join(', ')}`,
      });
    }

    next();
  };
};
