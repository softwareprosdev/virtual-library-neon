/**
 * Enhanced Security Utilities
 * Additional security measures beyond Helmet
 */
import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize user input to prevent XSS
 */
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return input;
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // Strip all HTML tags
    ALLOWED_ATTR: []
  });
};

/**
 * Sanitize object recursively
 */
export const sanitizeObject = <T extends Record<string, unknown>>(obj: T): T => {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeInput(item) : item
      );
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
};

/**
 * Middleware to sanitize request body
 */
export const sanitizeRequestBody = (req: Request, res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
};

/**
 * Validate that required fields exist and have valid types
 */
export const validateRequired = (
  body: Record<string, unknown>, 
  fields: { name: string; type: 'string' | 'number' | 'boolean'; maxLength?: number }[]
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  for (const field of fields) {
    const value = body[field.name];
    
    if (value === undefined || value === null) {
      errors.push(`${field.name} is required`);
      continue;
    }
    
    if (typeof value !== field.type) {
      errors.push(`${field.name} must be a ${field.type}`);
      continue;
    }
    
    if (field.type === 'string' && field.maxLength && (value as string).length > field.maxLength) {
      errors.push(`${field.name} must be at most ${field.maxLength} characters`);
    }
  }
  
  return { valid: errors.length === 0, errors };
};

/**
 * Security headers for API responses
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Prevent caching of sensitive data
  if (req.path.includes('/auth') || req.path.includes('/admin')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
  
  // Feature policy / Permissions policy
  res.setHeader('Permissions-Policy', 
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
  );
  
  // Cross-Origin policies
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  
  next();
};

/**
 * Prevent parameter pollution
 */
export const preventParamPollution = (req: Request, res: Response, next: NextFunction) => {
  // If any query param is an array, only keep the last value
  for (const key in req.query) {
    if (Array.isArray(req.query[key])) {
      const arr = req.query[key] as string[];
      req.query[key] = arr[arr.length - 1];
    }
  }
  next();
};

/**
 * Limit request body size per route
 */
export const limitBodySize = (maxBytes: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > maxBytes) {
      res.status(413).json({ message: 'Request body too large' });
      return;
    }
    next();
  };
};

/**
 * Log and block repeated failed attempts (brute force protection)
 */
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();

export const bruteForceLimiter = (maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const record = failedAttempts.get(key);
    
    if (record) {
      // Reset if window has passed
      if (now - record.lastAttempt > windowMs) {
        failedAttempts.delete(key);
      } else if (record.count >= maxAttempts) {
        res.status(429).json({ 
          message: 'Too many failed attempts. Please try again later.',
          retryAfter: Math.ceil((record.lastAttempt + windowMs - now) / 1000)
        });
        return;
      }
    }
    
    // Attach helper to track failed attempt
    res.locals.trackFailedAttempt = () => {
      const current = failedAttempts.get(key) || { count: 0, lastAttempt: now };
      failedAttempts.set(key, { count: current.count + 1, lastAttempt: now });
    };
    
    res.locals.resetFailedAttempts = () => {
      failedAttempts.delete(key);
    };
    
    next();
  };
};
