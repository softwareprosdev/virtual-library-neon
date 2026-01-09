import { Router, Request, Response } from 'express';
import prisma from '../db';
import { AuthRequest, authenticateToken } from '../middlewares/auth';
import { awardPoints, LEVELS } from '../services/gamificationService';

const router = Router();

// Get User Gamification Stats
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.sendStatus(401);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        badges: true,
        _count: {
          select: {
            following: true,
            followedBy: true
          }
        }
      }
    });

    if (!user) {
      res.sendStatus(404);
      return;
    }

    // Calculate next level progress
    const currentLevelInfo = LEVELS.find(l => l.level === user.level) || LEVELS[0];
    const nextLevelInfo = LEVELS.find(l => l.level === user.level + 1);
    
    let progress = 0;
    let nextLevelXp = 0;
    
    if (nextLevelInfo) {
      const prevXp = currentLevelInfo.xp;
      nextLevelXp = nextLevelInfo.xp;
      progress = Math.min(100, Math.max(0, ((user.points - prevXp) / (nextLevelXp - prevXp)) * 100));
    } else {
      progress = 100; // Max level
    }

    res.json({
      points: user.points,
      level: user.level,
      levelTitle: currentLevelInfo.title,
      progress: Math.round(progress),
      nextLevelXp,
      badges: user.badges,
      social: {
        following: user._count.following,
        followers: user._count.followedBy
      }
    });
  } catch (error) {
    console.error("Gamification Stats Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get Leaderboard
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const topUsers = await prisma.user.findMany({
      orderBy: { points: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        points: true,
        level: true,
        badges: {
          take: 3
        }
      }
    });

    // Add titles
    const leaderboard = topUsers.map((u) => ({
      ...u,
      title: LEVELS.find(l => l.level === u.level)?.title || "Novice"
    }));

    res.json(leaderboard);
  } catch (error) {
    console.error("Leaderboard Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get Activity Feed (Global or User)
router.get('/activity', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const activity = await prisma.activity.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true }
        }
      }
    });

    res.json(activity);
  } catch (error) {
    console.error("Activity Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Dev Endpoint to Seed Badges (Private/Admin only ideally, but public for dev)
router.post('/seed-badges', async (req: Request, res: Response) => {
  try {
    const badges = [
      { name: 'Early Adopter', description: 'Joined during the beta phase', iconUrl: '🚀' },
      { name: 'Bookworm', description: 'Read 10 books', iconUrl: '🐛' },
      { name: 'Social Butterfly', description: 'Joined 5 discussion rooms', iconUrl: '🦋' },
      { name: 'Night Owl', description: 'Active after midnight', iconUrl: '🦉' },
      { name: 'Critic', description: 'Left 5 reviews', iconUrl: '✍️' },
    ];

    for (const b of badges) {
      await prisma.badge.upsert({
        where: { name: b.name },
        update: {},
        create: b
      });
    }

    res.json({ message: "Badges seeded" });
  } catch (error) {
    res.status(500).json({ message: "Error seeding badges" });
  }
});

export default router;
