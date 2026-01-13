import { Router, Response } from 'express';
import prisma from '../db';
import { AuthRequest, authenticateToken } from '../middlewares/auth';

const router = Router();

// Get reading progress for a specific book
router.get('/book/:bookId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.sendStatus(401);
            return;
        }

        const { bookId } = req.params;

        const progress = await prisma.readingProgress.findUnique({
            where: {
                userId_bookId: {
                    userId: req.user.id,
                    bookId
                }
            },
            include: {
                book: {
                    select: {
                        id: true,
                        title: true,
                        author: true,
                        coverUrl: true,
                        pageCount: true
                    }
                }
            }
        });

        res.json(progress);
    } catch (error) {
        console.error('Error fetching reading progress:', error);
        res.status(500).json({ message: 'Failed to fetch reading progress' });
    }
});

// Get all reading progress for current user
router.get('/my', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.sendStatus(401);
            return;
        }

        const progress = await prisma.readingProgress.findMany({
            where: { userId: req.user.id },
            include: {
                book: {
                    select: {
                        id: true,
                        title: true,
                        author: true,
                        coverUrl: true,
                        pageCount: true
                    }
                }
            },
            orderBy: { lastReadAt: 'desc' }
        });

        res.json(progress);
    } catch (error) {
        console.error('Error fetching reading progress:', error);
        res.status(500).json({ message: 'Failed to fetch reading progress' });
    }
});

// Update reading progress
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.sendStatus(401);
            return;
        }

        const { bookId, currentPage, totalPages } = req.body;

        if (!bookId || currentPage === undefined || totalPages === undefined) {
            res.status(400).json({ message: 'bookId, currentPage, and totalPages are required' });
            return;
        }

        const percentComplete = Math.min(100, (currentPage / totalPages) * 100);

        const progress = await prisma.readingProgress.upsert({
            where: {
                userId_bookId: {
                    userId: req.user.id,
                    bookId
                }
            },
            update: {
                currentPage,
                totalPages,
                percentComplete,
                lastReadAt: new Date()
            },
            create: {
                userId: req.user.id,
                bookId,
                currentPage,
                totalPages,
                percentComplete,
                lastReadAt: new Date()
            },
            include: {
                book: {
                    select: {
                        id: true,
                        title: true,
                        author: true,
                        coverUrl: true
                    }
                }
            }
        });

        res.json(progress);
    } catch (error) {
        console.error('Error updating reading progress:', error);
        res.status(500).json({ message: 'Failed to update reading progress' });
    }
});

// Get reading statistics for user
router.get('/stats', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.sendStatus(401);
            return;
        }

        const [totalBooks, completedBooks, inProgressBooks, avgProgress] = await Promise.all([
            prisma.readingProgress.count({
                where: { userId: req.user.id }
            }),
            prisma.readingProgress.count({
                where: {
                    userId: req.user.id,
                    percentComplete: 100
                }
            }),
            prisma.readingProgress.count({
                where: {
                    userId: req.user.id,
                    percentComplete: {
                        gt: 0,
                        lt: 100
                    }
                }
            }),
            prisma.readingProgress.aggregate({
                where: { userId: req.user.id },
                _avg: {
                    percentComplete: true
                }
            })
        ]);

        res.json({
            totalBooks,
            completedBooks,
            inProgressBooks,
            averageProgress: avgProgress._avg.percentComplete || 0
        });
    } catch (error) {
        console.error('Error fetching reading stats:', error);
        res.status(500).json({ message: 'Failed to fetch reading stats' });
    }
});

export default router;
