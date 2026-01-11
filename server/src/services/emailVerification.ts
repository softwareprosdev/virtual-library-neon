import crypto from 'crypto';
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db';
import { Resend } from 'resend';
import { logSecurityEvent } from '../middleware/monitoring';
import { emailValidationService } from '../services/emailValidation';

const resend = new Resend(process.env.RESEND_API_KEY);

// Generate verification code
export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate verification token
export const generateVerificationToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Send verification code via email
export const sendVerificationCode = async (email: string, code: string, name?: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    // Use the verified domain as requested
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@mail.softwarepros.org';
    
    console.log(`[Email] Attempting to send verification code to ${email}`);
    console.log(`[Email] Using sender: ${fromEmail}`);
    if (!process.env.RESEND_API_KEY) {
      console.error('[Email] CRITICAL: RESEND_API_KEY is missing in environment variables');
      return { success: false, error: 'RESEND_API_KEY is missing' };
    }

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: 'Your Verification Code - Virtual Library',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #007bff; margin: 0;">Virtual Library</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center; margin: 20px 0;">
            <h2 style="color: #333; margin: 0 0 20px 0;">Email Verification Code</h2>
            <div style="font-size: 36px; font-weight: bold; color: #007bff; letter-spacing: 5px; margin: 20px 0; padding: 15px; background: white; border: 2px dashed #007bff; border-radius: 8px; display: inline-block;">
              ${code}
            </div>
            <p style="color: #666; margin: 20px 0;">This code will expire in 15 minutes.</p>
          </div>
          
          <div style="color: #666; font-size: 14px; line-height: 1.6;">
            <p>Hi ${name || 'there'},</p>
            <p>Thank you for signing up for Virtual Library! Please use the verification code above to verify your email address.</p>
            <p><strong>Important:</strong></p>
            <ul style="color: #e74c3c;">
              <li>Never share this code with anyone</li>
              <li>We will never ask for this code via phone or text message</li>
              <li>This code can only be used once</li>
            </ul>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              If you didn't create an account, you can safely ignore this email.
            </p>
          </div>
        </div>
      `
    });

    if (error) {
      console.error('[Email] Resend API Error:', JSON.stringify(error, null, 2));
      return { success: false, error: JSON.stringify(error) };
    }
    
    console.log(`[Email] Successfully sent verification code to ${email}. ID: ${data?.id}`);
    return { success: true };
  } catch (error) {
    console.error('[Email] Unexpected error sending verification code:', error);
    if (error instanceof Error) {
        console.error('[Email] Error stack:', error.stack);
        return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown error occurred' };
  }
};

// Send verification link (backup method)
export const sendVerificationLink = async (email: string, token: string, name?: string): Promise<boolean> => {
  try {
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/verify-email/${token}`;
    
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@virtual-library.com',
      to: [email],
      subject: 'Verify Your Email - Virtual Library',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Virtual Library!</h2>
          <p>Hi ${name || 'there'},</p>
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
        </div>
      `
    });
    
    return true;
  } catch (error) {
    console.error('Failed to send verification link:', error);
    return false;
  }
};

// Enhanced signup with email validation
export const enhancedSignup = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ 
        message: "Name, email, and password are required" 
      });
    }

    // Step 1: Validate email format
    const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!basicEmailRegex.test(email)) {
      logSecurityEvent({
        type: 'INVALID_EMAIL_FORMAT',
        severity: 'MEDIUM',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        details: { email }
      });
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Step 2: Validate email with external services
    const emailValidation = await emailValidationService.validateEmail(email);
    
    if (!emailValidation.isValid) {
      logSecurityEvent({
        type: 'INVALID_EMAIL_DETECTED',
        severity: 'HIGH',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        details: { 
          email, 
          validation: emailValidation 
        }
      });
      
      return res.status(400).json({ 
        message: "Please use a valid, deliverable email address",
        details: "The email address you provided appears to be invalid or non-existent"
      });
    }

    if (emailValidation.isDisposable) {
      logSecurityEvent({
        type: 'DISPOSABLE_EMAIL_DETECTED',
        severity: 'MEDIUM',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        details: { email }
      });
      
      return res.status(400).json({ 
        message: "Disposable email addresses are not allowed",
        details: "Please use a permanent email address"
      });
    }

    // Step 3: Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }

    // Step 4: Generate verification data
    const verificationCode = generateVerificationCode();
    const verificationToken = generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes for code, 24 hours for link

    // Step 5: Create user with unverified status
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        emailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationCode: verificationCode,
        emailVerificationExpires: verificationExpires,
      }
    });

    // Step 6: Send verification code
    const { success: codeSent, error: sendError } = await sendVerificationCode(email, verificationCode, name);
    
    if (!codeSent) {
      logSecurityEvent({
        type: 'VERIFICATION_CODE_SEND_FAILED',
        severity: 'HIGH',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        details: { email, userId: user.id, error: sendError }
      });
      
      // Don't fail the signup, but warn the user
      return res.status(201).json({
        message: "Account created! Verification email could not be sent. Please try to resend the verification code.",
        user: { 
          id: user.id, 
          name: user.name, 
          email: user.email, 
          emailVerified: user.emailVerified,
          needsVerification: true
        },
        warning: "Email verification code could not be sent",
        details: sendError
      });
    }

    logSecurityEvent({
      type: 'USER_REGISTERED',
      severity: 'LOW',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      details: { 
        userId: user.id, 
        email, 
        emailValidation 
      }
    });

    res.status(201).json({
      message: "Account created! Please check your email for a verification code.",
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        emailVerified: user.emailVerified,
        needsVerification: true
      }
    });

  } catch (error) {
    console.error("Enhanced signup error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
};

// Verify email with code
export const verifyEmailWithCode = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: "Email and verification code are required" });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    // Check if code is valid and not expired
    if (user.emailVerificationCode !== code) {
      logSecurityEvent({
        type: 'INVALID_VERIFICATION_CODE',
        severity: 'MEDIUM',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        details: { email, attempts: 1 }
      });
      
      return res.status(400).json({ message: "Invalid verification code" });
    }

    if (new Date() > user.emailVerificationExpires) {
      return res.status(400).json({ message: "Verification code has expired" });
    }

    // Mark email as verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationCode: null,
        emailVerificationToken: null,
        emailVerificationExpires: null
      }
    });

    logSecurityEvent({
      type: 'EMAIL_VERIFIED',
      severity: 'LOW',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      details: { userId: user.id, email }
    });

    res.json({ message: "Email verified successfully!" });

  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({ message: "Server error during verification" });
  }
};

// Resend verification code
export const resendVerificationCode = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    // Rate limiting logic removed to allow user retries as requested
    // (Handled by route rate limiter instead)

    // Generate new code
    const verificationCode = generateVerificationCode();
    const verificationExpires = new Date(Date.now() + 15 * 60 * 1000);

    // Update user with new code
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationCode: verificationCode,
        emailVerificationExpires: verificationExpires
      }
    });

    // Send new code
    const { success: codeSent, error: sendError } = await sendVerificationCode(email, verificationCode, user.name);

    if (!codeSent) {
      return res.status(500).json({ 
        message: "Failed to send verification code",
        details: sendError
      });
    }

    logSecurityEvent({
      type: 'VERIFICATION_CODE_RESENT',
      severity: 'LOW',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      details: { userId: user.id, email }
    });

    res.json({ message: "New verification code sent to your email" });

  } catch (error) {
    console.error("Resend verification code error:", error);
    res.status(500).json({ message: "Server error" });
  }
};