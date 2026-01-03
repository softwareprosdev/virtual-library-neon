import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// JWT payload interface for type safety
export interface JWTPayload {
  id: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: JWTPayload;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.sendStatus(401);
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET as string, (err, decoded) => {
    if (err) {
      res.sendStatus(403);
      return;
    }
    req.user = decoded as JWTPayload;
    next();
  });
};
