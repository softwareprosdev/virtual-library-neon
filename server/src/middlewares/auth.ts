import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../db';
import { logSecurityEvent } from '../middleware/monitoring';

// JWT payload interface for type safety
export interface JWTPayload {
  id: string;
  email: string;
  name?: string;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  const ip = req.ip || 'unknown';

  if (!token) {
    logSecurityEvent({
      type: 'MISSING_TOKEN',
      severity: 'MEDIUM',
      ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method
    });
    res.status(401).json({ message: 'Access token required' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JWTPayload;
    
    // Verify user still exists and is not banned
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, isBanned: true, role: true, lastLoginAt: true, lastLoginIp: true }
    });

    if (!user) {
      logSecurityEvent({
        type: 'TOKEN_FOR_DELETED_USER',
        severity: 'HIGH',
        ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        details: { userId: decoded.id }
      });
      res.status(401).json({ message: 'User not found' });
      return;
    }

    if (user.isBanned) {
      logSecurityEvent({
        type: 'BANNED_USER_ACCESS_ATTEMPT',
        severity: 'HIGH',
        ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        details: { userId: user.id, email: user.email }
      });
      res.status(403).json({ message: 'Account has been banned' });
      return;
    }

    // Check for suspicious login patterns (different IP, unusual time)
    if (user.lastLoginIp && user.lastLoginIp !== ip) {
      logSecurityEvent({
        type: 'SUSPICIOUS_LOGIN_IP_CHANGE',
        severity: 'MEDIUM',
        ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        details: { 
          userId: user.id,
          previousIp: user.lastLoginIp,
          currentIp: ip
        }
      });
    }

    req.user = decoded;
    
    // Update last login info periodically
    if (Math.random() < 0.1) { // 10% chance to update to avoid too frequent updates
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginIp: ip,
          lastLoginAt: new Date()
        }
      });
    }
    
    next();
  } catch (error) {
    const errorType = error instanceof jwt.TokenExpiredError ? 'EXPIRED_TOKEN' : 'INVALID_TOKEN';
    const severity = error instanceof jwt.TokenExpiredError ? 'MEDIUM' : 'HIGH';
    
    logSecurityEvent({
      type: errorType,
      severity,
      ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    });
    
    res.status(403).json({ message: 'Invalid or expired token' });
  }
};

export const requireEmailVerification = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    res.sendStatus(401);
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { emailVerified: true }
  });

  if (!user || !user.emailVerified) {
    res.status(403).json({ 
      message: "Email verification required. Please verify your email address." 
    });
    return;
  }

  next();
};

// Middleware to check for privileged actions
export const requirePrivilegedAccess = (action: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true, isBanned: true }
    });

    if (!user || user.isBanned) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (user.role !== 'ADMIN' && user.role !== 'ELITE_ADMIN') {
      logSecurityEvent({
        type: 'UNAUTHORIZED_PRIVILEGED_ACCESS_ATTEMPT',
        severity: 'HIGH',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        details: { 
          userId: req.user.id,
          action,
          userRole: user.role
        }
      });
      return res.status(403).json({ message: 'Admin access required' });
    }

    logSecurityEvent({
      type: 'PRIVILEGED_ACCESS',
      severity: 'MEDIUM',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      details: { 
        userId: req.user.id,
        action
      }
    });

    next();
  };
};
