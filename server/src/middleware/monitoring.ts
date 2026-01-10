import { Request, Response, NextFunction } from 'express';

// Security event logging
export const logSecurityEvent = (event: {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  ip: string;
  userAgent?: string;
  path?: string;
  method?: string;
  details?: any;
}) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[SECURITY-${event.severity}] ${event.type}: ${JSON.stringify({
    timestamp,
    ip: event.ip,
    userAgent: event.userAgent,
    path: event.path,
    method: event.method,
    details: event.details
  })}`;
  
  console.warn(logMessage);
  
  // In production, you might want to send this to a security monitoring service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Integrate with security monitoring service
    // Example: send to Sentry, Datadog, or custom webhook
  }
};

// Middleware to detect and log suspicious patterns
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || 'unknown';
  const userAgent = req.get('User-Agent') || '';
  const path = req.originalUrl;
  const method = req.method;
  
  // Detect suspicious user agents
  const suspiciousUserAgents = [
    /bot/i,
    /crawler/i,
    /scanner/i,
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /masscan/i,
    /python-requests/i,
    /curl/i,
    /wget/i,
    /powershell/i
  ];
  
  const isSuspiciousUserAgent = suspiciousUserAgents.some(pattern => pattern.test(userAgent));
  
  if (isSuspiciousUserAgent) {
    logSecurityEvent({
      type: 'SUSPICIOUS_USER_AGENT',
      severity: 'MEDIUM',
      ip,
      userAgent,
      path,
      method,
      details: { userAgent }
    });
  }
  
  // Detect unusual request patterns
  const suspiciousPatterns = [
    /\.\./,
    /\/etc\/passwd/i,
    /\/proc\/version/i,
    /\/windows\/system32/i,
    /<script/i,
    /javascript:/i,
    /eval\(/i,
    /exec\(/i,
    /union\s+select/i,
    /drop\s+table/i,
    /insert\s+into/i
  ];
  
  const hasSuspiciousPattern = suspiciousPatterns.some(pattern => 
    pattern.test(path) || 
    pattern.test(JSON.stringify(req.query)) ||
    pattern.test(JSON.stringify(req.body))
  );
  
  if (hasSuspiciousPattern) {
    logSecurityEvent({
      type: 'SUSPICIOUS_REQUEST_PATTERN',
      severity: 'HIGH',
      ip,
      userAgent,
      path,
      method,
      details: { query: req.query, body: req.body }
    });
  }
  
  // Detect potential enumeration attacks
  const idEnumerationPattern = /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (idEnumerationPattern.test(path) && method === 'GET') {
    const recentSimilarRequests = 0; // In production, track this in Redis or database
    if (recentSimilarRequests > 50) { // Threshold for enumeration detection
      logSecurityEvent({
        type: 'POTENTIAL_ENUMERATION_ATTACK',
        severity: 'HIGH',
        ip,
        userAgent,
        path,
        method,
        details: { requestCount: recentSimilarRequests }
      });
    }
  }
  
  next();
};

// Track failed authentication attempts
const failedAuthAttempts = new Map<string, { count: number; resetTime: number; lastAttempt: number }>();

export const trackFailedAuth = (email: string, ip: string) => {
  const now = Date.now();
  const key = `${email}:${ip}`;
  const current = failedAuthAttempts.get(key);
  
  if (!current || now > current.resetTime) {
    failedAuthAttempts.set(key, {
      count: 1,
      resetTime: now + (15 * 60 * 1000), // 15 minutes
      lastAttempt: now
    });
    return;
  }
  
  current.count++;
  current.lastAttempt = now;
  
  if (current.count >= 5) {
    logSecurityEvent({
      type: 'MULTIPLE_FAILED_AUTH',
      severity: 'HIGH',
      ip,
      details: { 
        email, 
        attemptCount: current.count,
        timeWindow: '15 minutes'
      }
    });
  } else if (current.count >= 3) {
    logSecurityEvent({
      type: 'FAILED_AUTH_ATTEMPT',
      severity: 'MEDIUM',
      ip,
      details: { 
        email, 
        attemptCount: current.count,
        timeWindow: '15 minutes'
      }
    });
  }
};

export const resetFailedAuth = (email: string, ip: string) => {
  const key = `${email}:${ip}`;
  failedAuthAttempts.delete(key);
};

// Detect potential DoS attacks
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const detectPotentialDoS = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const suspiciousThreshold = 100; // requests per minute
  
  const current = requestCounts.get(ip);
  
  if (!current || now > current.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
    return next();
  }
  
  current.count++;
  
  if (current.count >= suspiciousThreshold) {
    logSecurityEvent({
      type: 'POTENTIAL_DOS_ATTACK',
      severity: 'CRITICAL',
      ip,
      userAgent: req.get('User-Agent'),
      path: req.originalUrl,
      method: req.method,
      details: { 
        requestCount: current.count,
        timeWindow: '1 minute'
      }
    });
  }
  
  next();
};

// Monitor for data exfiltration patterns
export const detectDataExfiltration = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || 'unknown';
  const userAgent = req.get('User-Agent') || '';
  
  // Check for large response sizes or bulk downloads
  res.on('finish', () => {
    const contentLength = parseInt(res.get('Content-Length') || '0');
    const isLargeResponse = contentLength > 50 * 1024 * 1024; // 50MB
    
    if (isLargeResponse && req.path.includes('/api/')) {
      logSecurityEvent({
        type: 'POTENTIAL_DATA_EXFILTRATION',
        severity: 'HIGH',
        ip,
        userAgent,
        path: req.originalUrl,
        method: req.method,
        details: { 
          contentLength,
          contentType: res.get('Content-Type')
        }
      });
    }
  });
  
  next();
};