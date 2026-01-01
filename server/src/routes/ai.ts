import { Router, Response } from 'express';
import prisma from '../db';
import { AuthRequest, authenticateToken } from '../middlewares/auth';

const router = Router();

// Generate Recap for a finished room
router.post('/recap/:roomId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    
    // 1. Fetch Transcripts/Messages
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { messages: true, transcripts: true }
    });

    if (!room) {
      res.status(404).json({ message: "Archive not found" });
      return;
    }

    // 2. Simulated AI Processing
    // In a real scenario, we'd send transcripts to Gemini/OpenAI here.
    const summary = `This session explored the themes of "${room.name}" within the ${room.genreId} genre. Key discussions focused on literary depth and community engagement.`;
    const highlights = [
      "Neural link established successfully across all sectors.",
      "Vibrant discussion on character development and world-building.",
      "High compliance with safety protocols during mature segments."
    ];

    const recap = await prisma.recap.upsert({
      where: { roomId },
      update: { summary, highlights },
      create: { roomId, summary, highlights }
    });

    res.json(recap);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "AI Processing Failed" });
  }
});

// Get Recap
router.get('/recap/:roomId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const recap = await prisma.recap.findUnique({
      where: { roomId: req.params.roomId }
    });
    if (!recap) {
      res.status(404).json({ message: "No recap available" });
      return;
    }
    res.json(recap);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
