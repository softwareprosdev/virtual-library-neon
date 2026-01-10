import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

// SQL injection patterns
const sqlInjectionPatterns = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
  /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
  /(\b(OR|AND)\s+\w+\s*=\s*\w+)/i,
  /(\b(OR|AND)\s+\'\w+\'\s*=\s*\'\w+\')/i,
  /(\/\*.*\*\/|--)/,
  /(\'\s*(OR|AND)\s*\w+\s*=\s*\w+\s*\')/i,
  /(\b(XOR|NOT|BETWEEN|IN|LIKE|REGEXP)\b)/i
];

// XSS patterns
const xssPatterns = [
  /<script[^>]*>.*?<\/script>/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /<object[^>]*>.*?<\/object>/gi,
  /<embed[^>]*>.*?<\/embed>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<[^>]*on\w+\s*=[^>]*>/gi,
  /eval\s*\(/gi,
  /expression\s*\(/gi,
  /vbscript:/gi,
  /data:text\/html/gi
];

// NoSQL injection patterns
const noSqlInjectionPatterns = [
  /\$where/gi,
  /\$ne/gi,
  /\$gt/gi,
  /\$lt/gi,
  /\$in/gi,
  /\$nin/gi,
  /\$regex/gi,
  /\{[^}]*\$where[^}]*\}/gi
];

export interface SanitizationOptions {
  allowHTML?: boolean;
  maxLength?: number;
  allowEmpty?: boolean;
  customPattern?: RegExp;
}

// Comprehensive input sanitization
export const sanitizeInput = (input: any, options: SanitizationOptions = {}): any => {
  const {
    allowHTML = false,
    maxLength = 10000,
    allowEmpty = true,
    customPattern
  } = options;

  if (input === null || input === undefined) {
    return allowEmpty ? input : '';
  }

  if (typeof input === 'string') {
    let sanitized = input.trim();
    
    // Check length
    if (sanitized.length > maxLength) {
      throw new Error(`Input exceeds maximum length of ${maxLength}`);
    }
    
    // Custom pattern validation
    if (customPattern && !customPattern.test(sanitized)) {
      throw new Error('Input does not match required pattern');
    }
    
    // Check for SQL injection
    if (sqlInjectionPatterns.some(pattern => pattern.test(sanitized))) {
      throw new Error('Potential SQL injection detected');
    }
    
    // Check for XSS
    if (xssPatterns.some(pattern => pattern.test(sanitized))) {
      throw new Error('Potential XSS attack detected');
    }
    
    // Check for NoSQL injection
    if (noSqlInjectionPatterns.some(pattern => pattern.test(sanitized))) {
      throw new Error('Potential NoSQL injection detected');
    }
    
    // Sanitize with DOMPurify if HTML is not allowed
    if (!allowHTML) {
      sanitized = DOMPurify.sanitize(sanitized, { ALLOWED_TAGS: [] });
    } else {
      sanitized = DOMPurify.sanitize(sanitized);
    }
    
    // Additional escaping
    sanitized = validator.escape(sanitized);
    
    return sanitized;
  }
  
  if (typeof input === 'object') {
    if (Array.isArray(input)) {
      return input.map(item => sanitizeInput(item, options));
    }
    
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[sanitizeInput(key, { allowEmpty: false })] = sanitizeInput(value, options);
    }
    return sanitized;
  }
  
  return input;
};

// Email validation
export const validateEmail = (email: string): boolean => {
  return validator.isEmail(email) && email.length <= 254;
};

// URL validation
export const validateURL = (url: string): boolean => {
  return validator.isURL(url, { 
    protocols: ['http', 'https'],
    require_protocol: true,
    allow_underscores: false
  });
};

// ID validation (UUID)
export const validateUUID = (id: string): boolean => {
  return validator.isUUID(id, 4);
};

// Password strength validation
export const validatePasswordStrength = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// Request validation middleware
export const validateRequest = (validationRules: { [key: string]: SanitizationOptions }) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate query parameters
      if (req.query && Object.keys(req.query).length > 0) {
        req.query = sanitizeInput(req.query);
      }
      
      // Validate request body
      if (req.body && Object.keys(req.body).length > 0) {
        req.body = sanitizeInput(req.body);
      }
      
      // Apply specific validation rules
      if (req.body) {
        for (const [field, options] of Object.entries(validationRules)) {
          if (req.body[field] !== undefined) {
            req.body[field] = sanitizeInput(req.body[field], options);
          }
        }
      }
      
      next();
    } catch (error) {
      console.error('[SECURITY] Request validation failed:', error);
      res.status(400).json({
        message: 'Invalid input data',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
};

// File upload validation
export const validateFileUpload = (file: Express.Multer.File): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const allowedMimeTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain',
    'application/epub+zip'
  ];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt', '.epub'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (!allowedMimeTypes.includes(file.mimetype)) {
    errors.push(`File type ${file.mimetype} is not allowed`);
  }
  
  const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
  if (!allowedExtensions.includes(fileExtension)) {
    errors.push(`File extension ${fileExtension} is not allowed`);
  }
  
  if (file.size > maxSize) {
    errors.push(`File size exceeds maximum limit of 10MB`);
  }
  
  // Check for dangerous content in filename
  const dangerousPatterns = [
    /\.\./, /<script/, /javascript:/, /vbscript:/, /on\w+=/
  ];
  
  if (dangerousPatterns.some(pattern => pattern.test(file.originalname))) {
    errors.push('Filename contains dangerous characters');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};