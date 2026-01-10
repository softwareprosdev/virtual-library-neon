// TypeScript ambient declarations to smooth deployment builds

export {};

declare global {
  namespace Express {
    // Allow req.user to be available on requests
    interface Request {
      user?: any;
    }
  }
  // Multer compatibility types
  declare namespace Multer {
    interface File {
      fieldname?: string;
      originalname?: string;
      encoding?: string;
      mimetype?: string;
      size?: number;
      destination?: string;
      filename?: string;
      path?: string;
    }
  }
}

// Global notification service hook used by sockets
declare const getNotificationService: any;
