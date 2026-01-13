import { Request, Response, NextFunction } from 'express';
import { logSecurityEvent } from './monitoring';

// Block any external HTTP requests that might exfiltrate data
// NOTE: Be careful not to block legitimate browser requests!
export const blockExternalRequests = (req: Request, res: Response, next: NextFunction) => {
  const userAgent = req.get('User-Agent') || '';
  const ip = (req.ip as string) || 'unknown';
  
  // Only block truly malicious/automated attack tools, NOT development tools
  // Be very conservative here - false positives break the entire app
  const trulyMaliciousAgents = [
    /scrapy/i,
    /beautifulsoup/i,
    /phantomjs/i,
    /casperjs/i,
    /nikto/i,
    /sqlmap/i,
    /nmap/i,
    /openvas/i,
    /masscan/i
  ];
  
  // Only block if user agent is DEFINITELY malicious AND not empty
  if (userAgent && trulyMaliciousAgents.some(agent => agent.test(userAgent))) {
    logSecurityEvent({
      type: 'SUSPICIOUS_USER_AGENT_BLOCKED',
      severity: 'HIGH',
      ip,
      userAgent,
      path: req.path,
      method: req.method,
      details: { userAgent }
    });
    
    return res.status(403).json({ message: 'Access denied' });
  }
  
  // Only block request body patterns for POST/PUT requests (not GET)
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const bodyString = JSON.stringify(req.body);
    // Only block truly dangerous exfiltration patterns
    const trulyDangerousPatterns = [
      /exfiltrate|exfiltration/i,
      /password.*base64|base64.*password/i
    ];
    
    if (trulyDangerousPatterns.some(pattern => pattern.test(bodyString))) {
      logSecurityEvent({
        type: 'SUSPICIOUS_PAYLOAD_BLOCKED',
        severity: 'CRITICAL',
        ip,
        userAgent,
        path: req.path,
        method: req.method,
        details: { 
          body: bodyString.substring(0, 200)
        }
      });
      
      return res.status(400).json({ message: 'Invalid request' });
    }
  }
  
  next();
};

// Enhanced password protection
export const protectPasswordData = (req: Request, res: Response, next: NextFunction) => {
  if (req.body && req.body.password) {
    // Log password attempts for security monitoring
    logSecurityEvent({
      type: 'PASSWORD_SUBMISSION',
      severity: 'LOW',
      ip: (req.ip as string),
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      details: { 
        hasPassword: true,
        passwordLength: req.body.password.length
      }
    });
  }
  
  next();
};

// Block any attempts to access sensitive system paths
export const blockSystemPaths = (req: Request, res: Response, next: NextFunction) => {
  const dangerousPaths = [
    '/etc/passwd',
    '/etc/shadow',
    '/etc/hosts',
    '/proc/',
    '/sys/',
    '/windows/',
    'system32',
    'boot.ini',
    'win.ini'
  ];
  
  const decodedPath = decodeURIComponent(req.path).toLowerCase();
  
  if (dangerousPaths.some(dangerPath => decodedPath.includes(dangerPath))) {
    logSecurityEvent({
      type: 'SYSTEM_PATH_ACCESS_ATTEMPT',
      severity: 'CRITICAL',
      ip: (req.ip as string),
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      details: { decodedPath }
    });
    
    return res.status(403).json({ message: 'Access denied' });
  }
  
  next();
};