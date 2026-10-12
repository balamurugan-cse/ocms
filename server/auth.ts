import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db, User } from './db.js';

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || 'dmi_ocms_secure_jwt_secret_token_key_2026';
const TOKEN_EXPIRY = '7d';

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: User['role'];
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function signToken(user: User): string {
  const payload: AuthTokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
  } catch (err) {
    return null;
  }
}

export function extractToken(req: Request): string | null {
  if (req.cookies && req.cookies.dmi_ocms_token) {
    return req.cookies.dmi_ocms_token;
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
    return;
  }

  const data = db.read();
  const user = data.users.find((u) => u.id === payload.userId);
  if (!user || user.status === 'disabled') {
    res.status(403).json({ error: 'User account is inactive or not found.' });
    return;
  }

  req.user = user;
  next();
}

export function optionalAuthenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      const data = db.read();
      const user = data.users.find((u) => u.id === payload.userId);
      if (user && user.status === 'active') {
        req.user = user;
      }
    }
  }
  next();
}

export function authorizeRoles(...allowedRoles: User['role'][]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}. Current role: ${req.user.role}`
      });
      return;
    }

    next();
  };
}
