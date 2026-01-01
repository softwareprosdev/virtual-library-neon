import { Router, Request, Response } from 'express';
import { Resend } from 'resend';
import { authenticateToken, AuthRequest } from '../middlewares/auth';

const router = Router();
const resend = new Resend(process.env.RESEND_API_KEY);

router.post('/subscribe', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email } = req.user;

    // 1. Send Welcome Email via Resend
    await resend.emails.send({
      from: 'V-Library <onboarding@resend.dev>', // Update with your verified domain
      to: email,
      subject: 'Welcome to the Virtual Library Archives',
      html: `
        <div style="background-color: #000; color: #d946ef; padding: 40px; font-family: sans-serif;">
          <h1 style="border-bottom: 2px solid #d946ef; padding-bottom: 10px;">NEURAL_LINK_ESTABLISHED</h1>
          <p style="color: #fff; font-size: 16px;">Welcome to the Archives, citizen.</p>
          <p style="color: #cbd5e1;">You have successfully subscribed to our mature content transmissions. Your 18+ access is verified.</p>
          <br/>
          <div style="border: 1px solid #333; padding: 20px; color: #ec4899;">
            <strong>ACCESS_GRANTED: MATURE_LITERATURE_NETWORKS</strong>
          </div>
        </div>
      `
    });

    res.json({ message: "Subscription transmission successful" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to process subscription" });
  }
});

export default router;
