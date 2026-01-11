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
  
  // Skip for API routes that don't need CSRF (auth, external services, etc.)
  const skipPaths = [
    '/api/auth/',
    '/auth/',
    '/api/livekit/',
    '/api/webhooks/',
    '/api/notifications/',
    '/api/activity/'
  ];
  
  if (skipPaths.some(path => req.path.startsWith(path))) {
    return next();
  }
  
  // Skip CSRF for development environment
  if (process.env.NODE_ENV === 'development' && req.headers.origin?.includes('localhost')) {
    return next();
  }
  
  const sessionToken = req.headers['x-session-token'] as string;
  const csrfToken = req.headers['x-csrf-token'] as string || req.body._csrf;
  
  // More lenient for missing tokens - provide fallback
  if (!sessionToken || !csrfToken) {
    // For development or local requests, skip strict checking
    if (process.env.NODE_ENV === 'development' || (req.ip && ['127.0.0.1', '::1'].includes(req.ip))) {
      return next();
    }
    
    console.warn(`[SECURITY] Missing CSRF tokens: ${req.method} ${req.path} from IP: ${req.ip}`);
    return res.status(403).json({ message: 'CSRF token required' });
  }
  
  if (!validateCSRFToken(csrfToken, sessionToken)) {
    // Allow development requests
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[DEV] Skipping CSRF validation for development: ${req.method} ${req.path}`);
      return next();
    }
    
    console.warn(`[SECURITY] Invalid CSRF token: ${req.method} ${req.path} from IP: ${req.ip}`);
    return res.status(403).json({ message: 'Invalid CSRF token' });
  }
  
  next();
};

// Middleware to provide CSRF token
export const provideCSRFToken = (req: Request, res: Response, next: NextFunction) => {
  const sessionToken = req.headers['x-session-token'] as string || crypto.randomBytes(16).toString('hex');
  
  // Reuse existing token if valid, otherwise generate new one
  let tokenData = csrfTokens.get(sessionToken);
  let token: string;

  if (tokenData && Date.now() < tokenData.expires) {
    token = tokenData.token;
  } else {
    token = generateCSRFToken();
    // Store token with 1 hour expiration
    csrfTokens.set(sessionToken, {
      token,
      expires: Date.now() + (60 * 60 * 1000)
    });
  }
  
  // Clean up expired tokens (occasionally or scheduled, but here is fine for now)
  // Optimization: Don't scan map on every request.
  if (Math.random() < 0.01) { // 1% chance to cleanup
    const now = Date.now();
    csrfTokens.forEach((value, key) => {
      if (now > value.expires) {
        csrfTokens.delete(key);
      }
    });
  }
  
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
  const maxRequests = 300; // Increased from 10 to allow frequent API calls
  
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