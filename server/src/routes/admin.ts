import { Router, Response } from 'express';
import prisma from '../db';
import { AuthRequest, authenticateToken } from '../middlewares/auth';

const router = Router();

// Middleware to check admin role
const requireAdmin = async (req: AuthRequest, res: Response, next: () => void) => {
  if (!req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { role: true }
  });

  if (!user || (user.role !== 'ADMIN' && user.role !== 'ELITE_ADMIN')) {
    res.status(403).json({ message: 'Admin access required' });
    return;
  }

  next();
};

// Get dashboard stats
router.get('/stats', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      activeUsers,
      bannedUsers,
      totalRooms,
      activeRooms,
      totalMessages,
      totalBooks,
      pendingReports,
      recentUsers
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { lastLoginAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
      prisma.user.count({ where: { isBanned: true } }),
      prisma.room.count(),
      prisma.room.count({ where: { isLive: true } }),
      prisma.message.count(),
      prisma.book.count(),
      prisma.report.count({ where: { status: 'PENDING' as any } }),
      prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, createdAt: true, role: true, isBanned: true }
      })
    ]);

    res.json({
      stats: {
        totalUsers,
        activeUsers,
        bannedUsers,
        totalRooms,
        activeRooms,
        totalMessages,
        totalBooks,
        pendingReports
      },
      recentUsers
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users with pagination and filters
router.get('/users', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string || '';
    const filter = req.query.filter as string || 'all';

    const where: Record<string, unknown> = {};
    
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (filter === 'banned') where.isBanned = true;
    if (filter === 'admin') where.role = 'ADMIN';
    if (filter === 'moderator') where.role = 'MODERATOR';

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          displayName: true,
          role: true,
          isBanned: true,
          banReason: true,
          warningCount: true,
          createdAt: true,
          lastLoginAt: true,
          points: true,
          level: true,
          _count: {
            select: {
              messages: true,
              books: true,
              ownedRooms: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Ban user
router.post('/users/:id/ban', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (id === req.user?.id) {
      res.status(400).json({ message: 'Cannot ban yourself' });
      return;
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        isBanned: true,
        banReason: reason || 'Violation of terms of service',
        bannedAt: new Date(),
        bannedBy: req.user?.id
      }
    });

    // Log admin action
    await prisma.adminLog.create({
      data: {
        adminId: req.user!.id,
        action: 'BAN_USER',
        targetId: id,
        details: reason,
        ipAddress: req.ip
      }
    });

    res.json({ message: 'User banned', user: { id: user.id, isBanned: user.isBanned } });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Unban user
router.post('/users/:id/unban', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await prisma.user.update({
      where: { id },
      data: {
        isBanned: false,
        banReason: null,
        bannedAt: null,
        bannedBy: null
      }
    });

    await prisma.adminLog.create({
      data: {
        adminId: req.user!.id,
        action: 'UNBAN_USER',
        targetId: id,
        ipAddress: req.ip
      }
    });

    res.json({ message: 'User unbanned', user: { id: user.id, isBanned: user.isBanned } });
  } catch (error) {
    console.error('Unban user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Warn user
router.post('/users/:id/warn', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await prisma.user.update({
      where: { id },
      data: {
        warningCount: { increment: 1 }
      }
    });

    await prisma.adminLog.create({
      data: {
        adminId: req.user!.id,
        action: 'WARN_USER',
        targetId: id,
        details: reason,
        ipAddress: req.ip
      }
    });

    res.json({ message: 'Warning issued', warningCount: user.warningCount });
  } catch (error) {
    console.error('Warn user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change user role
router.put('/users/:id/role', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!['USER', 'MODERATOR', 'ADMIN'].includes(role)) {
      res.status(400).json({ message: 'Invalid role' });
      return;
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role }
    });

    await prisma.adminLog.create({
      data: {
        adminId: req.user!.id,
        action: 'CHANGE_ROLE',
        targetId: id,
        details: `Changed role to ${role}`,
        ipAddress: req.ip
      }
    });

    res.json({ message: 'Role updated', user: { id: user.id, role: user.role } });
  } catch (error) {
    console.error('Change role error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get reports
router.get('/reports', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const status = req.query.status as string || 'PENDING';

    const reports = await prisma.report.findMany({
      where: { status: status as any },
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        reported: { select: { id: true, name: true, email: true, isBanned: true } }
      }
    });

    res.json(reports);
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Resolve report
router.put('/reports/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, resolution } = req.body;

    const report = await prisma.report.update({
      where: { id },
      data: {
        status,
        resolution,
        resolvedBy: req.user?.id,
        resolvedAt: new Date()
      }
    });

    res.json(report);
  } catch (error) {
    console.error('Resolve report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get admin logs
router.get('/logs', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const logs = await prisma.adminLog.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    res.json(logs);
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user content (messages, posts, etc.)
router.delete('/users/:id/content', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { type } = req.query;

    if (type === 'messages') {
      await prisma.message.deleteMany({ where: { senderId: id } });
    } else if (type === 'bookposts') {
      await prisma.bookPost.deleteMany({ where: { userId: id } });
    }

    await prisma.adminLog.create({
      data: {
        adminId: req.user!.id,
        action: `DELETE_${(type as string).toUpperCase()}`,
        targetId: id,
        ipAddress: req.ip
      }
    });

    res.json({ message: `${type} deleted` });
  } catch (error) {
    console.error('Delete content error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get analytics
router.get('/analytics', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get daily user signups
    const userSignups = await prisma.user.groupBy({
      by: ['createdAt'],
      where: { createdAt: { gte: startDate } },
      _count: true
    });

    // Get daily messages
    const messageStats = await prisma.message.groupBy({
      by: ['createdAt'],
      where: { createdAt: { gte: startDate } },
      _count: true
    });

    res.json({
      userSignups,
      messageStats,
      period: { start: startDate, end: new Date(), days }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Grant Verification Badge
router.post('/users/:id/verify', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body; // "author", "influencer", "notable", "contributor"

    const user = await prisma.user.update({
      where: { id },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        verificationReason: reason || 'verified'
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        isVerified: true,
        verifiedAt: true,
        verificationReason: true
      }
    });

    await prisma.adminLog.create({
      data: {
        adminId: req.user!.id,
        action: 'VERIFY_USER',
        targetId: id,
        details: `Granted verification badge: ${reason || 'verified'}`,
        ipAddress: req.ip
      }
    });

    // Create notification for the user
    await prisma.notification.create({
      data: {
        userId: id,
        type: 'SYSTEM',
        title: 'Verification Granted! ✓',
        body: 'Congratulations! Your account has been verified.'
      }
    });

    res.json({ message: 'User verified', user });
  } catch (error) {
    console.error('Verify user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove Verification Badge
router.delete('/users/:id/verify', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await prisma.user.update({
      where: { id },
      data: {
        isVerified: false,
        verifiedAt: null,
        verificationReason: null
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        isVerified: true
      }
    });

    await prisma.adminLog.create({
      data: {
        adminId: req.user!.id,
        action: 'UNVERIFY_USER',
        targetId: id,
        ipAddress: req.ip
      }
    });

    res.json({ message: 'Verification removed', user });
  } catch (error) {
    console.error('Unverify user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
