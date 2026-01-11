import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { Resend } from 'resend';
import prisma from '../db';
import { AuthRequest, authenticateToken } from '../middlewares/auth';
import { logSecurityEvent, trackFailedAuth, resetFailedAuth } from '../middleware/monitoring';
import { validateEmail, validatePasswordStrength } from '../middleware/validation';
import { 
  enhancedSignup, 
  verifyEmailWithCode, 
  resendVerificationCode 
} from '../services/emailVerification';

const router = Router();
const isProduction = process.env.NODE_ENV === 'production';
const resend = new Resend(process.env.RESEND_API_KEY);

// Stricter rate limit for registration
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 registration attempts per hour
  message: { message: 'Too many registration attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit for resending verification code (20 attempts per 15 mins for debugging)
const resendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Increased limit for debugging
  message: { message: 'Too many verification attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Enhanced Register with email verification code
// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.post('/register', registerLimiter as any, async (req: Request, res: Response): Promise<void> => {
  await enhancedSignup(req, res);
});

// Verify email with code
router.post('/verify-email', async (req: Request, res: Response): Promise<void> => {
  await verifyEmailWithCode(req, res);
});

// Resend verification code
router.post('/resend-verification', resendLimiter as any, async (req: Request, res: Response): Promise<void> => {
  await resendVerificationCode(req, res);
});

// Legacy register (for backward compatibility)
router.post('/register-legacy', registerLimiter as any, async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    // Enhanced email validation
    if (!validateEmail(email)) {
      logSecurityEvent({
        type: 'INVALID_EMAIL_REGISTRATION',
        severity: 'MEDIUM',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        details: { email }
      });
      res.status(400).json({ message: "Invalid email format" });
      return;
    }

    // Enhanced password strength validation
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      logSecurityEvent({
        type: 'WEAK_PASSWORD_REGISTRATION',
        severity: 'MEDIUM',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        details: { email, errors: passwordValidation.errors }
      });
      res.status(400).json({ 
        message: "Password does not meet security requirements",
        errors: passwordValidation.errors
      });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ message: "User already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

// Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,

      }
    });

    // Send verification email
    try {
      const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      const verificationUrl = `${baseUrl}/verify-email/${verificationToken}`;
      
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@mail.softwarepros.org',
        to: [email],
        subject: 'Verify your Virtual Library account',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Welcome to Virtual Library!</h2>
            <p>Hi ${name},</p>
            <p>Thank you for signing up! Please verify your email address to activate your account.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background-color: #007bff; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
            </p>
            <p style="color: #666; font-size: 12px;">
              Alternatively, you can copy and paste this link: ${verificationUrl}
            </p>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue with registration even if email fails
    }

    const expiresIn = process.env.JWT_EXPIRES_IN || '15m';
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] }
    );

    res.status(201).json({ 
      token, 
      user: { id: user.id, name: user.name, email: user.email, emailVerified: user.emailVerified },
      message: 'Registration successful! Please check your email to verify your account.'
    });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      trackFailedAuth(email, req.ip || 'unknown');
      logSecurityEvent({
        type: 'LOGIN_FAILED_USER_NOT_FOUND',
        severity: 'MEDIUM',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        details: { email }
      });
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      trackFailedAuth(email, req.ip || 'unknown');
      logSecurityEvent({
        type: 'LOGIN_FAILED_INVALID_PASSWORD',
        severity: 'MEDIUM',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        details: { email, userId: user.id }
      });
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    // Check if email is verified
    if (!user.emailVerified) {
      logSecurityEvent({
        type: 'LOGIN_UNVERIFIED_EMAIL',
        severity: 'MEDIUM',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        details: { email, userId: user.id }
      });

      res.status(403).json({
        message: "Please verify your email address before logging in",
        requiresVerification: true,
        email: user.email
      });
      return;
    }

    // Reset failed auth attempts on successful login
    resetFailedAuth(email, req.ip || 'unknown');

    const loginExpiresIn = process.env.JWT_EXPIRES_IN || '15m';
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: loginExpiresIn as jwt.SignOptions['expiresIn'] }
    );

    logSecurityEvent({
      type: 'LOGIN_SUCCESS',
      severity: 'LOW',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      details: { userId: user.id, email }
    });

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email,
        emailVerified: user.emailVerified
      } 
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Verify Email
router.get('/verify-email/:token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      res.status(400).json({ message: "Invalid or expired verification token" });
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null
      }
    });

    res.json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Resend Verification Email
router.post('/resend-verification', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: "Email is required" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(400).json({ message: "User not found" });
      return;
    }

    if (user.emailVerified) {
      res.status(400).json({ message: "Email already verified" });
      return;
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires
      }
    });

// Send verification email
    try {
      const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      const verificationUrl = `${baseUrl}/verify-email/${verificationToken}`;
      
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'noreply@mail.softwarepros.org',
        to: [email],
        subject: 'Verify your Virtual Library account',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Verify Your Email</h2>
            <p>Hi ${user.name || 'there'},</p>
            <p>You requested to verify your email address for Virtual Library.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background-color: #007bff; color: white; padding: 12px 30px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              This link will expire in 24 hours.
            </p>
            <p style="color: #666; font-size: 12px;">
              Alternatively, you can copy and paste this link: ${verificationUrl}
            </p>
          </div>
        `
      });
      
      res.json({ message: "Verification email sent successfully" });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      res.status(500).json({ message: "Failed to send verification email" });
    }
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get Current User
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.sendStatus(401);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, emailVerified: true, createdAt: true }
    });
    
    if (!user) {
      res.sendStatus(404);
      return;
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
