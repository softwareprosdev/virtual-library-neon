import { Router, Response } from 'express';
import { AccessToken } from 'livekit-server-sdk';
import { AuthRequest, authenticateToken } from '../middlewares/auth';
import { getRoomRole } from '../permissions';
import { validateUUID } from '../middleware/validation';

const router = Router();

router.get('/token', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.sendStatus(401);
      return;
    }

    const { roomId } = req.query as { roomId: string };

    if (!roomId) {
      res.status(400).json({ message: "Room ID is required" });
      return;
    }

    if (!validateUUID(roomId)) {
      res.status(400).json({ message: "Invalid Room ID format" });
      return;
    }

    // Validate LiveKit credentials
    if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
      res.status(500).json({ message: "LiveKit not configured" });
      return;
    }

    const userId = req.user.id;
    const email = req.user.email;
    await getRoomRole(userId, roomId);

    // Create Access Token
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: userId,
        name: email,
      }
    );

    // Grant Permissions based on Role
    at.addGrant({
      roomJoin: true,
      room: roomId,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    res.json({ token: await at.toJwt() });
  } catch (error) {
    console.error('LiveKit Token Error:', error);
    res.status(500).json({ message: "Failed to generate token", error: String(error) });
  }
});

export default router;
