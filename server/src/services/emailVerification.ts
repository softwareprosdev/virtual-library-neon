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
      subject: 'VERIFICATION_CODE_REQUIRED // Virtual Library',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Verification Code</title>
        </head>
        <body style="background-color: #050505; margin: 0; padding: 0; font-family: 'Courier New', Courier, monospace; color: #e0e0e0;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050505; min-height: 100vh;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <div style="max-width: 600px; width: 100%; background-color: #0a0a0a; border: 1px solid #333; border-left: 4px solid #d946ef; box-shadow: 0 0 20px rgba(217, 70, 239, 0.1);">
                  
                  <!-- Header -->
                  <div style="background-color: #000; padding: 20px; border-bottom: 1px solid #333;">
                    <h1 style="color: #d946ef; margin: 0; font-size: 24px; letter-spacing: 2px; text-transform: uppercase; text-shadow: 0 0 5px rgba(217, 70, 239, 0.5);">
                      Virtual Library
                    </h1>
                    <div style="color: #00f3ff; font-size: 10px; letter-spacing: 1px; margin-top: 5px;">
                      SYSTEM_MESSAGE // ENCRYPTED_CHANNEL
                    </div>
                  </div>

                  <!-- Content -->
                  <div style="padding: 40px 30px; text-align: center;">
                    <h2 style="color: #fff; margin: 0 0 20px 0; font-size: 18px; text-transform: uppercase; letter-spacing: 1px;">
                      Identity Verification Required
                    </h2>
                    
                    <p style="color: #888; font-size: 14px; margin-bottom: 30px; line-height: 1.6;">
                      Access request detected. To proceed with the neural link connection, please input the following authentication code:
                    </p>

                    <div style="background-color: #000; border: 1px dashed #00f3ff; padding: 20px; margin: 30px 0; display: inline-block;">
                      <span style="font-size: 32px; font-weight: bold; color: #00f3ff; letter-spacing: 8px; font-family: monospace;">
                        ${code}
                      </span>
                    </div>

                    <p style="color: #666; font-size: 12px; margin-top: 20px;">
                      Code expires in: <span style="color: #d946ef;">15:00 MINUTES</span>
                    </p>
                  </div>

                  <!-- Footer -->
                  <div style="background-color: #0f0f0f; padding: 20px; text-align: center; border-top: 1px solid #333; font-size: 10px; color: #555;">
                    <p style="margin: 0 0 10px 0;">INITIATED_BY: ${name || 'UNKNOWN_USER'}</p>
                    <p style="margin: 0;">
                      IF YOU DID NOT REQUEST THIS ACCESS, TERMINATE IMMEDIATELY.
                    </p>
                  </div>
                </div>
              </td>
            </tr>
          </table>
        </body>
        </html>
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
      from: process.env.RESEND_FROM_EMAIL || 'noreply@mail.softwarepros.org',
      to: [email],
      subject: 'VERIFICATION_LINK_REQUIRED // Virtual Library',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Verify Email</title>
        </head>
        <body style="background-color: #050505; margin: 0; padding: 0; font-family: 'Courier New', Courier, monospace; color: #e0e0e0;">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050505; min-height: 100vh;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <div style="max-width: 600px; width: 100%; background-color: #0a0a0a; border: 1px solid #333; border-left: 4px solid #00f3ff; box-shadow: 0 0 20px rgba(0, 243, 255, 0.1);">
                  
                  <!-- Header -->
                  <div style="background-color: #000; padding: 20px; border-bottom: 1px solid #333;">
                    <h1 style="color: #00f3ff; margin: 0; font-size: 24px; letter-spacing: 2px; text-transform: uppercase; text-shadow: 0 0 5px rgba(0, 243, 255, 0.5);">
                      Virtual Library
                    </h1>
                    <div style="color: #d946ef; font-size: 10px; letter-spacing: 1px; margin-top: 5px;">
                      SYSTEM_MESSAGE // ENCRYPTED_CHANNEL
                    </div>
                  </div>

                  <!-- Content -->
                  <div style="padding: 40px 30px; text-align: center;">
                    <h2 style="color: #fff; margin: 0 0 20px 0; font-size: 18px; text-transform: uppercase; letter-spacing: 1px;">
                      Confirm Identity
                    </h2>
                    
                    <p style="color: #888; font-size: 14px; margin-bottom: 30px; line-height: 1.6;">
                      Connection request received from ${name || 'User'}. Validate your neural signature to access the network.
                    </p>

                    <div style="margin: 30px 0;">
                      <a href="${verificationUrl}" 
                         style="background-color: #000; color: #00f3ff; padding: 15px 30px; text-decoration: none; border: 1px solid #00f3ff; font-weight: bold; letter-spacing: 2px; display: inline-block; transition: all 0.3s;">
                        VERIFY_SIGNAL
                      </a>
                    </div>

                    <p style="color: #666; font-size: 12px; margin-top: 20px;">
                      Link expires in: <span style="color: #d946ef;">24:00 HOURS</span>
                    </p>
                  </div>

                  <!-- Footer -->
                  <div style="background-color: #0f0f0f; padding: 20px; text-align: center; border-top: 1px solid #333; font-size: 10px; color: #555;">
                     <p style="margin: 0 0 10px 0;">SECURE_TRANSMISSION</p>
                     <p style="margin: 0;">IF UNKNOWN, DISREGARD.</p>
                  </div>
                </div>
              </td>
            </tr>
          </table>
        </body>
        </html>
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