import { Router, Response } from 'express';
import prisma from '../db';
import { AuthRequest, authenticateToken } from '../middlewares/auth';

const router = Router();

// List all rooms
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const rooms = await prisma.room.findMany({
      include: {
        host: {
          select: { name: true, email: true }
        },
        _count: {
          select: { messages: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Create a room
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      res.status(400).json({ message: "Room name is required" });
      return;
    }

    const room = await prisma.room.create({
      data: {
        name,
        description,
        hostId: req.user.id
      }
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
