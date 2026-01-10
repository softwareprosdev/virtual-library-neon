import { Request, Response, NextFunction } from 'express';
import { logSecurityEvent } from './monitoring';

// Block any external HTTP requests that might exfiltrate data
export const blockExternalRequests = (req: Request, res: Response, next: NextFunction) => {
  const userAgent = req.get('User-Agent') || '';
  const ip = req.ip || 'unknown';
  
  // Block suspicious user agents that might be scrapers or automated tools
  const suspiciousAgents = [
    /python/i,
    /curl/i,
    /wget/i,
    /perl/i,
    /java/i,
    /scrapy/i,
    /beautifulsoup/i,
    /selenium/i,
    /phantomjs/i,
    /casperjs/i,
    /node-fetch/i
  ];
  
  if (suspiciousAgents.some(agent => agent.test(userAgent))) {
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
  
  // Block requests containing suspicious payload patterns
  const bodyString = JSON.stringify(req.body);
  const suspiciousPatterns = [
    /fetch\s*\(\s*['"`]https?:\/\/./i,
    /axios\s*\.\s*(get|post)\s*\(\s*['"`]https?:\/\/./i,
    /https?:\/\/.*password/i,
    /webhook|hook\.|web\.hook/i,
    /exfiltrate|exfiltration/i,
    /base64.*password|password.*base64/i,
    /btoa\s*\([^)]*password|password[^)]*btoa\s*\(/i
  ];
  
  if (suspiciousPatterns.some(pattern => pattern.test(bodyString))) {
    logSecurityEvent({
      type: 'SUSPICIOUS_PAYLOAD_BLOCKED',
      severity: 'CRITICAL',
      ip,
      userAgent,
      path: req.path,
      method: req.method,
      details: { 
        body: bodyString.substring(0, 200) // Log first 200 chars for analysis
      }
    });
    
    return res.status(400).json({ message: 'Invalid request' });
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
      ip: req.ip,
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
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      details: { decodedPath }
    });
    
    return res.status(403).json({ message: 'Access denied' });
  }
  
  next();
};