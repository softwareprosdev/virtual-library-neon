import { Router, Response } from 'express';
import prisma from '../db';
import { AuthRequest, authenticateToken } from '../middlewares/auth';

const router = Router();

// Create a new story
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { mediaUrl, mediaType = 'image', caption, backgroundColor, textContent, duration = 5 } = req.body;

    if (!mediaUrl && !textContent) {
      res.status(400).json({ message: 'Either mediaUrl or textContent is required' });
      return;
    }

    // Stories expire after 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const story = await prisma.story.create({
      data: {
        userId: req.user.id,
        mediaUrl: mediaUrl || '',
        mediaType,
        caption,
        backgroundColor,
        textContent,
        duration,
        expiresAt
      },
      include: {
        user: {
          select: { id: true, name: true, displayName: true, avatarUrl: true }
        }
      }
    });

    res.status(201).json(story);
  } catch (error) {
    console.error('Create story error:', error);
    res.status(500).json({ message: 'Failed to create story' });
  }
});

// Get stories from followed users (and own stories)
router.get('/feed', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Get list of users the current user follows
    const following = await prisma.follows.findMany({
      where: { followerId: req.user.id },
      select: { followingId: true }
    });

    const followingIds = following.map(f => f.followingId);
    // Include own stories
    followingIds.push(req.user.id);

    // Get active stories (not expired) from followed users
    const stories = await prisma.story.findMany({
      where: {
        userId: { in: followingIds },
        expiresAt: { gt: new Date() }
      },
      include: {
        user: {
          select: { id: true, name: true, displayName: true, avatarUrl: true }
        },
        views: {
          where: { viewerId: req.user.id },
          select: { id: true }
        },
        _count: {
          select: { views: true, reactions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Group stories by user
    const storiesByUser = stories.reduce((acc, story) => {
      const userId = story.userId;
      if (!acc[userId]) {
        acc[userId] = {
          user: story.user,
          stories: [],
          hasUnviewed: false
        };
      }
      const storyData = {
        ...story,
        viewed: story.views.length > 0,
        viewCount: story._count.views,
        reactionCount: story._count.reactions
      };
      acc[userId].stories.push(storyData);
      if (!storyData.viewed) {
        acc[userId].hasUnviewed = true;
      }
      return acc;
    }, {} as Record<string, { user: typeof stories[0]['user']; stories: (typeof stories[0] & { viewed: boolean })[]; hasUnviewed: boolean }>);

    // Convert to array and sort (unviewed first, then by most recent)
    type StoryGroup = { user: typeof stories[0]['user']; stories: (typeof stories[0] & { viewed: boolean })[]; hasUnviewed: boolean };
    const result = (Object.values(storiesByUser) as StoryGroup[]).sort((a, b) => {
      if (a.user.id === req.user!.id) return -1; // Own stories first
      if (b.user.id === req.user!.id) return 1;
      if (a.hasUnviewed && !b.hasUnviewed) return -1;
      if (!a.hasUnviewed && b.hasUnviewed) return 1;
      return 0;
    });

    res.json(result);
  } catch (error) {
    console.error('Get stories feed error:', error);
    res.status(500).json({ message: 'Failed to get stories' });
  }
});

// Get a user's stories
router.get('/user/:userId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { userId } = req.params;

    const stories = await prisma.story.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() }
      },
      include: {
        user: {
          select: { id: true, name: true, displayName: true, avatarUrl: true }
        },
        views: userId === req.user.id ? {
          include: {
            viewer: {
              select: { id: true, name: true, displayName: true, avatarUrl: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        } : {
          where: { viewerId: req.user.id },
          select: { id: true }
        },
        reactions: userId === req.user.id ? {
          include: {
            user: {
              select: { id: true, name: true, displayName: true, avatarUrl: true }
            }
          }
        } : {
          where: { userId: req.user.id }
        },
        _count: {
          select: { views: true, reactions: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    res.json(stories);
  } catch (error) {
    console.error('Get user stories error:', error);
    res.status(500).json({ message: 'Failed to get stories' });
  }
});

// View a story
router.post('/:storyId/view', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { storyId } = req.params;

    const story = await prisma.story.findUnique({
      where: { id: storyId }
    });

    if (!story) {
      res.status(404).json({ message: 'Story not found' });
      return;
    }

    // Don't record self-views
    if (story.userId === req.user.id) {
      res.json({ message: 'Own story viewed' });
      return;
    }

    // Create or update view
    await prisma.storyView.upsert({
      where: {
        storyId_viewerId: {
          storyId,
          viewerId: req.user.id
        }
      },
      create: {
        storyId,
        viewerId: req.user.id
      },
      update: {}
    });

    res.json({ message: 'Story viewed' });
  } catch (error) {
    console.error('View story error:', error);
    res.status(500).json({ message: 'Failed to record view' });
  }
});

// React to a story
router.post('/:storyId/react', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { storyId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      res.status(400).json({ message: 'Emoji is required' });
      return;
    }

    const story = await prisma.story.findUnique({
      where: { id: storyId },
      include: { user: { select: { id: true } } }
    });

    if (!story) {
      res.status(404).json({ message: 'Story not found' });
      return;
    }

    const reaction = await prisma.storyReaction.upsert({
      where: {
        storyId_userId: {
          storyId,
          userId: req.user.id
        }
      },
      create: {
        storyId,
        userId: req.user.id,
        emoji
      },
      update: { emoji }
    });

    // Create notification for story owner
    if (story.userId !== req.user.id) {
      await prisma.notification.create({
        data: {
          userId: story.userId,
          actorId: req.user.id,
          type: 'STORY_REACTION',
          title: 'Story Reaction',
          body: `reacted ${emoji} to your story`,
          data: { storyId }
        }
      });
    }

    res.json(reaction);
  } catch (error) {
    console.error('React to story error:', error);
    res.status(500).json({ message: 'Failed to react to story' });
  }
});

// Delete a story
router.delete('/:storyId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { storyId } = req.params;

    const story = await prisma.story.findUnique({
      where: { id: storyId }
    });

    if (!story) {
      res.status(404).json({ message: 'Story not found' });
      return;
    }

    if (story.userId !== req.user.id) {
      res.status(403).json({ message: 'Not authorized to delete this story' });
      return;
    }

    await prisma.story.delete({
      where: { id: storyId }
    });

    res.json({ message: 'Story deleted' });
  } catch (error) {
    console.error('Delete story error:', error);
    res.status(500).json({ message: 'Failed to delete story' });
  }
});

export default router;
