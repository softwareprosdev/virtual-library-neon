import { Router, Response } from 'express';
import prisma from '../db';
import { AuthRequest, authenticateToken } from '../middlewares/auth';

const router = Router();

// List all genres with live room counts
router.get('/genres', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('Backend: Fetching genres...');
    const genres = await prisma.genre.findMany({
      include: {
        _count: {
          select: { rooms: { where: { isLive: true } } }
        }
      },
      orderBy: { name: 'asc' }
    });
    console.log(`Backend: Found ${genres.length} genres`);
    res.json(genres);
  } catch (error) {
    console.error('Backend Genre Error:', error);
    res.status(500).json({ message: "Server error" });
  }
});

// List all active rooms
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('Backend: Fetching live rooms...');
    const rooms = await prisma.room.findMany({
      where: { isLive: true },
      include: {
        host: { select: { name: true, email: true } },
        genre: true,
        _count: { select: { messages: true, participants: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    console.log(`Backend: Found ${rooms.length} live rooms`);
    res.json(rooms);
  } catch (error) {
    console.error('Backend Room Error:', error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create a room
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description, genreId } = req.body;
    
    if (!name) {
      res.status(400).json({ message: "Room name is required" });
      return;
    }

    const room = await prisma.room.create({
      data: {
        name,
        description,
        hostId: req.user.id,
        genreId: genreId || null,
        isLive: true
      },
      include: { genre: true }
    });

    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get single room
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        genre: true,
        messages: {
          take: 50,
          orderBy: { createdAt: 'asc' },
          include: {
            sender: { select: { id: true, name: true } }
          }
        }
      }
    });

    if (!room) {
      res.status(404).json({ message: "Room not found" });
      return;
    }

    res.json(room);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;