import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Store blocked IPs and their unblock time
const blockedIPs = new Map<string, number>();

// Middleware to check if IP is blocked
export const ipBlockMiddleware = (req: Request, res: Response, next: Function) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (ip && blockedIPs.has(ip)) {
    const unblockTime = blockedIPs.get(ip)!;
    if (now < unblockTime) {
      console.warn(`[SECURITY] Blocked IP attempted access: ${ip}`);
      return res.status(429).json({ 
        message: 'IP temporarily blocked due to suspicious activity',
        blockedUntil: new Date(unblockTime).toISOString()
      });
    } else {
      blockedIPs.delete(ip);
    }
  }
  
  next();
};

// Function to block an IP for specified minutes
export const blockIP = (ip: string, minutes: number = 30) => {
  const unblockTime = Date.now() + (minutes * 60 * 1000);
  blockedIPs.set(ip, unblockTime);
  console.warn(`[SECURITY] IP blocked: ${ip} for ${minutes} minutes`);
};

// Advanced rate limiter with progressive penalties
export const createAdvancedRateLimit = (options: {
  windowMs: number;
  maxRequests: number;
  blockDurationMinutes?: number;
  skipSuccessfulRequests?: boolean;
}) => {
  const requestCounts = new Map<string, { count: number; resetTime: number; warnings: number }>();
  
  return rateLimit({
    windowMs: options.windowMs,
    max: options.maxRequests,
    message: { message: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    keyGenerator: (req) => req.ip || req.connection.remoteAddress || 'unknown',
    handler: (req: Request, res: Response) => {
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const current = requestCounts.get(ip);
      
      if (current && current.warnings >= 2) {
        // Block IP after 3 violations
        blockIP(ip, options.blockDurationMinutes || 60);
        return res.status(429).json({
          message: 'IP blocked due to repeated rate limit violations',
          blockDuration: `${options.blockDurationMinutes || 60} minutes`
        });
      }
      
      // Increment warning count
      requestCounts.set(ip, {
        ...current!,
        warnings: (current?.warnings || 0) + 1
      });
      
      res.status(429).json({
        message: 'Rate limit exceeded. Repeated violations will result in temporary IP blocking.',
        warning: current?.warnings || 0
      });
    },
    onLimitReached: (req: Request, res: Response) => {
      console.warn(`[SECURITY] Rate limit reached: ${req.ip} - ${req.method} ${req.originalUrl}`);
    },
    onHeadersSent: (req: Request, res: Response) => {
      // Clean up old entries
      const now = Date.now();
      requestCounts.forEach((value, key) => {
        if (now > value.resetTime) {
          requestCounts.delete(key);
        }
      });
    }
  });
};

// IP whitelist for trusted services
export const trustedIPs = new Set([
  '127.0.0.1',
  '::1',
  'localhost'
]);

export const isTrustedIP = (ip: string) => {
  return trustedIPs.has(ip) || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.');
};

// Detection of suspicious patterns
export const detectSuspiciousActivity = (req: Request) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || '';
  const suspiciousPatterns = [
    /\b(bot|crawler|spider|scraper)\b/i,
    /\b(selenium|webdriver|puppeteer|playwright)\b/i,
    /\b(curl|wget|python|java|node|php)\b/i
  ];
  
  const isBot = suspiciousPatterns.some(pattern => pattern.test(userAgent));
  const hasNoUserAgent = userAgent.length < 10;
  const isSuspiciousUserAgent = userAgent.includes('bot') || userAgent.includes('crawler');
  
  return {
    ip,
    isBot,
    hasNoUserAgent,
    isSuspiciousUserAgent,
    userAgent
  };
};