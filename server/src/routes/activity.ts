import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middlewares/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get global activity feed
router.get('/feed', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    // Get recent activities
    const activities = await prisma.activity.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true
          }
        }
      }
    });

    // Get recent book posts
    const bookPosts = await prisma.bookPost.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true
          }
        }
      }
    });

    // Combine and format feed items
    const feedItems = [
      ...activities.map(activity => ({
        id: `activity-${activity.id}`,
        type: 'activity',
        data: activity,
        createdAt: activity.createdAt
      })),
      ...bookPosts.map(post => ({
        id: `bookpost-${post.id}`,
        type: 'book_post',
        data: post,
        createdAt: post.createdAt
      }))
    ];

    // Sort by creation date
    feedItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Return paginated results
    res.status(200).json({
      feed: feedItems.slice(0, limit),
      hasMore: feedItems.length > limit
    });
  } catch (error) {
    console.error('Error fetching global feed:', error);
    res.status(500).json({ error: 'Failed to fetch feed' });
  }
});

// Get feed from followed users
router.get('/feed/following/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    // Get users that the current user follows
    const followedUsers = await prisma.follows.findMany({
      where: { followerId: userId },
      select: { followingId: true }
    });

    const followedUserIds = followedUsers.map(f => f.followingId);
    
    if (followedUserIds.length === 0) {
      return res.status(200).json({ feed: [], hasMore: false });
    }

    // Get activities from followed users
    const activities = await prisma.activity.findMany({
      where: {
        userId: { in: followedUserIds }
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true
          }
        }
      }
    });

    // Get book posts from followed users
    const bookPosts = await prisma.bookPost.findMany({
      where: {
        userId: { in: followedUserIds }
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true
          }
        }
      }
    });

    // Get profile comments on followed users' profiles
    const profileComments = await prisma.profileComment.findMany({
      where: {
        userId: { in: followedUserIds }
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true
          }
        },
        author: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true
          }
        }
      }
    });

    // Combine and format feed items
    const feedItems = [
      ...activities.map(activity => ({
        id: `activity-${activity.id}`,
        type: 'activity',
        data: activity,
        createdAt: activity.createdAt
      })),
      ...bookPosts.map(post => ({
        id: `bookpost-${post.id}`,
        type: 'book_post',
        data: post,
        createdAt: post.createdAt
      })),
      ...profileComments.map(comment => ({
        id: `comment-${comment.id}`,
        type: 'profile_comment',
        data: comment,
        createdAt: comment.createdAt
      }))
    ];

    // Sort by creation date
    feedItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Return paginated results
    res.status(200).json({
      feed: feedItems.slice(0, limit),
      hasMore: feedItems.length > limit
    });
  } catch (error) {
    console.error('Error fetching following feed:', error);
    res.status(500).json({ error: 'Failed to fetch following feed' });
  }
});

// Get user's activity
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const activities = await prisma.activity.findMany({
      where: { userId },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true
          }
        }
      }
    });

    res.status(200).json(activities);
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(500).json({ error: 'Failed to fetch user activity' });
  }
});

// Create custom activity (for when users do certain actions)
router.post('/activity', authenticateToken, async (req, res) => {
  try {
    const { type, details } = req.body;
    const userId = req.user!.userId;

    const activity = await prisma.activity.create({
      data: {
        userId,
        type,
        details
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true
          }
        }
      }
    });

    res.status(201).json(activity);
  } catch (error) {
    console.error('Error creating activity:', error);
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

export default router;