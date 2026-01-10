import { Request, Response, NextFunction } from 'express';
import { config } from 'dotenv';
import crypto from 'crypto';

config();

// Simple CSRF token implementation (alternative to csurf package)
const csrfTokens = new Map<string, { token: string; expires: number }>();

export const generateCSRFToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const validateCSRFToken = (token: string, sessionToken: string): boolean => {
  const storedData = csrfTokens.get(sessionToken);
  if (!storedData) return false;
  
  if (Date.now() > storedData.expires) {
    csrfTokens.delete(sessionToken);
    return false;
  }
  
  return storedData.token === token;
};

export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for GET, HEAD, OPTIONS requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Skip for API routes that don't need CSRF (auth, etc.)
  if (req.path.startsWith('/api/auth/') || req.path.startsWith('/auth/')) {
    return next();
  }
  
  const sessionToken = req.headers['x-session-token'] as string;
  const csrfToken = req.headers['x-csrf-token'] as string || req.body._csrf;
  
  if (!sessionToken || !csrfToken) {
    console.warn(`[SECURITY] Missing CSRF tokens: ${req.method} ${req.path} from IP: ${req.ip}`);
    return res.status(403).json({ message: 'CSRF token required' });
  }
  
  if (!validateCSRFToken(csrfToken, sessionToken)) {
    console.warn(`[SECURITY] Invalid CSRF token: ${req.method} ${req.path} from IP: ${req.ip}`);
    return res.status(403).json({ message: 'Invalid CSRF token' });
  }
  
  next();
};

// Middleware to provide CSRF token
export const provideCSRFToken = (req: Request, res: Response, next: NextFunction) => {
  const sessionToken = req.headers['x-session-token'] as string || crypto.randomBytes(16).toString('hex');
  const token = generateCSRFToken();
  
  // Store token with 1 hour expiration
  csrfTokens.set(sessionToken, {
    token,
    expires: Date.now() + (60 * 60 * 1000)
  });
  
  // Clean up expired tokens
  const now = Date.now();
  csrfTokens.forEach((value, key) => {
    if (now > value.expires) {
      csrfTokens.delete(key);
    }
  });
  
  res.setHeader('X-CSRF-Token', token);
  res.setHeader('X-Session-Token', sessionToken);
  next();
};

// Rate limiting for CSRF token generation
const csrfRequestCounts = new Map<string, { count: number; resetTime: number }>();

export const csrfRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 10;
  
  const current = csrfRequestCounts.get(ip);
  
  if (!current || now > current.resetTime) {
    csrfRequestCounts.set(ip, { count: 1, resetTime: now + windowMs });
    return next();
  }
  
  if (current.count >= maxRequests) {
    return res.status(429).json({ message: 'Too many CSRF token requests' });
  }
  
  current.count++;
  next();
};