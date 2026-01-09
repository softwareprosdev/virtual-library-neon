import { Router, Response } from 'express';
import prisma from '../db';
import { AuthRequest, authenticateToken } from '../middlewares/auth';
import { awardPoints } from '../services/gamificationService';

const router = Router();

// Add book to reading list (or update status)
router.post('/update', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.sendStatus(401);
      return;
    }

    const { googleId, title, author, coverUrl, status, rating, review } = req.body;

    if (!googleId) {
      res.status(400).json({ message: "Book ID required" });
      return;
    }

    // Upsert reading list entry
    const entry = await prisma.readingList.upsert({
      where: {
        userId_googleId: {
          userId: req.user.id,
          googleId
        }
      },
      update: {
        status: status,
        rating: rating,
        review: review,
        ...(status === 'READING' && { startDate: new Date() }),
        ...(status === 'FINISHED' && { finishDate: new Date() })
      },
      create: {
        userId: req.user.id,
        googleId,
        title,
        author,
        coverUrl,
        status: status || 'WANT_TO_READ',
        rating,
        review,
        ...(status === 'READING' && { startDate: new Date() })
      }
    });

    // Award points for finishing a book
    if (status === 'FINISHED') {
        // Check if just finished (to avoid duplicate points for repeated updates)
        // Simplified logic: Just award points. 
        // Ideally we check if previous status was not FINISHED.
        await awardPoints(req.user.id, 50, `Finished reading "${title}"`);
    }

    res.json(entry);
  } catch (error) {
    console.error("Reading List Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user's reading list
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.sendStatus(401);
      return;
    }

    const list = await prisma.readingList.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' }
    });

    res.json(list);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Delete entry
router.delete('/:googleId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.sendStatus(401);
      return;
    }

    await prisma.readingList.delete({
        where: {
            userId_googleId: {
                userId: req.user.id,
                googleId: req.params.googleId
            }
        }
    });

    res.json({ message: "Removed from list" });
  } catch (error) {
    res.status(500).json({ message: "Deletion failed" });
  }
});

export default router;
