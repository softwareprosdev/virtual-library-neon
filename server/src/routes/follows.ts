import express from 'express';
import { authenticateToken } from '../middlewares/auth';
import { getNotificationService } from '../services/notificationService';
import prisma from '../db';

const router = express.Router();

// Follow a user
router.post('/follow', authenticateToken, async (req, res) => {
  try {
    const { followingId } = req.body;
    const followerId = req.user!.userId;

    if (followerId === followingId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    // Check if user exists
    const followingUser = await prisma.user.findUnique({
      where: { id: followingId }
    });

    if (!followingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already following
    const existingFollow = await prisma.follows.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    });

    if (existingFollow) {
      return res.status(400).json({ error: 'Already following this user' });
    }

    // Create follow relationship
    const follow = await prisma.follows.create({
      data: {
        followerId,
        followingId
      },
      include: {
        follower: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true
          }
        },
        following: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true
          }
        }
      }
    });

    // Create activity notification
    await prisma.activity.create({
      data: {
        userId: followerId,
        type: 'FOLLOW_USER',
        details: `Started following ${followingUser.displayName || followingUser.name}`
      }
    });

    // Send real-time notification
    try {
      const notificationService = getNotificationService();
      notificationService.sendFollowNotification(
        followerId,
        req.user!.displayName || req.user!.name,
        followingId
      );
    } catch (error) {
      console.error('Failed to send follow notification:', error);
    }

    res.status(201).json(follow);
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({ error: 'Failed to follow user' });
  }
});

// Unfollow a user
router.delete('/unfollow', authenticateToken, async (req, res) => {
  try {
    const { followingId } = req.body;
    const followerId = req.user!.userId;

    // Check if follow relationship exists
    const existingFollow = await prisma.follows.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    });

    if (!existingFollow) {
      return res.status(400).json({ error: 'Not following this user' });
    }

    // Remove follow relationship
    await prisma.follows.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    });

    // Create activity notification
    await prisma.activity.create({
      data: {
        userId: followerId,
        type: 'UNFOLLOW_USER',
        details: `Unfollowed user`
      }
    });

    res.status(200).json({ message: 'Successfully unfollowed user' });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ error: 'Failed to unfollow user' });
  }
});

// Get user's followers
router.get('/followers/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const followers = await prisma.follows.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true,
            profileViews: true,
            level: true,
            points: true
          }
        }
      },
      orderBy: { assignedAt: 'desc' }
    });

    res.status(200).json(followers.map(f => f.follower));
  } catch (error) {
    console.error('Error getting followers:', error);
    res.status(500).json({ error: 'Failed to get followers' });
  }
});

// Get user's following
router.get('/following/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const following = await prisma.follows.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true,
            profileViews: true,
            level: true,
            points: true
          }
        }
      },
      orderBy: { assignedAt: 'desc' }
    });

    res.status(200).json(following.map(f => f.following));
  } catch (error) {
    console.error('Error getting following:', error);
    res.status(500).json({ error: 'Failed to get following' });
  }
});

// Check if current user is following another user
router.get('/check/:followingId', authenticateToken, async (req, res) => {
  try {
    const { followingId } = req.params;
    const followerId = req.user!.userId;

    const follow = await prisma.follows.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    });

    res.status(200).json({ isFollowing: !!follow });
  } catch (error) {
    console.error('Error checking follow status:', error);
    res.status(500).json({ error: 'Failed to check follow status' });
  }
});

// Get follow statistics
router.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const [followersCount, followingCount] = await Promise.all([
      prisma.follows.count({ where: { followingId: userId } }),
      prisma.follows.count({ where: { followerId: userId } })
    ]);

    res.status(200).json({
      followersCount,
      followingCount
    });
  } catch (error) {
    console.error('Error getting follow stats:', error);
    res.status(500).json({ error: 'Failed to get follow stats' });
  }
});

export default router;