import { User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        displayName?: string;
        name?: string;
        role?: string;
      } | null;
    }
  }
}

export {};