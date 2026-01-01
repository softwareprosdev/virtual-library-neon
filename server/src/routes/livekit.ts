import { Router, Response } from 'express';
import { AccessToken } from 'livekit-server-sdk';
import { AuthRequest, authenticateToken } from '../middlewares/auth';
import { getRoomRole, Role } from '../permissions';

const router = Router();

router.get('/token', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { roomId } = req.query as { roomId: string };
    if (!roomId) {
      res.status(400).json({ message: "Room ID is required" });
      return;
    }

    const userId = req.user.id;
    const email = req.user.email;
    const role = await getRoomRole(userId, roomId);

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
      canPublish: true, // Allow all to use cam/mic as requested
      canSubscribe: true,
      canPublishData: true,
    });

    res.json({ token: await at.toJwt() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to generate token" });
  }
});

export default router;
