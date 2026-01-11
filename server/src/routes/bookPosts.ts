import { Router, Response } from 'express';
import prisma from '../db';
import { AuthRequest, authenticateToken } from '../middlewares/auth';

const router = Router();

// Get user's book posts
router.get('/user/:userId', async (req, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const bookPosts = await prisma.bookPost.findMany({
      where: { userId },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        user: {
          select: { id: true, name: true, displayName: true, avatarUrl: true }
        }
      }
    });

    res.json(bookPosts);
  } catch (error) {
    console.error('Get book posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single book post
router.get('/:id', async (req, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const bookPost = await prisma.bookPost.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, displayName: true, avatarUrl: true }
        }
      }
    });

    if (!bookPost) {
      res.status(404).json({ message: 'Book post not found' });
      return;
    }

    res.json(bookPost);
  } catch (error) {
    console.error('Get book post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper to append affiliate tag
const appendAffiliateTag = (url: string | null | undefined) => {
  if (!url) return url;
  
  const amazonTag = process.env.AMAZON_ASSOCIATE_TAG || 'indexbin-20';
  
  // Check if it's an Amazon URL
  if (url.match(/amazon\.|amzn\./)) {
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.set('tag', amazonTag);
      return urlObj.toString();
    } catch (e) {
      return url;
    }
  }
  
  return url;
};

// Create book post
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log('Book post request body:', req.body);
    console.log('Book post request user:', req.user?.id);
    
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { title, description, coverUrl, purchaseUrl, previewUrl, genre, publishedDate } = req.body;

    if (!title || !description) {
      res.status(400).json({ message: 'Title and description are required' });
      return;
    }

    const affiliateUrl = appendAffiliateTag(purchaseUrl);

    const bookPost = await prisma.bookPost.create({
      data: {
        userId: req.user.id,
        title,
        description,
        coverUrl,
        purchaseUrl: affiliateUrl,
        previewUrl,
        genre,
        publishedDate: publishedDate ? new Date(publishedDate) : null
      },
      include: {
        user: {
          select: { id: true, name: true, displayName: true, avatarUrl: true }
        }
      }
    });

    res.status(201).json(bookPost);
  } catch (error) {
    console.error('Create book post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update book post
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { title, description, coverUrl, purchaseUrl, previewUrl, genre, publishedDate, isPinned } = req.body;

    const existing = await prisma.bookPost.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: 'Book post not found' });
      return;
    }

    if (existing.userId !== req.user.id) {
      res.status(403).json({ message: 'Not authorized to edit this post' });
      return;
    }

    const affiliateUrl = appendAffiliateTag(purchaseUrl);

    const bookPost = await prisma.bookPost.update({
      where: { id },
      data: {
        title,
        description,
        coverUrl,
        purchaseUrl: affiliateUrl,
        previewUrl,
        genre,
        publishedDate: publishedDate ? new Date(publishedDate) : null,
        isPinned
      }
    });

    res.json(bookPost);
  } catch (error) {
    console.error('Update book post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete book post
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const existing = await prisma.bookPost.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ message: 'Book post not found' });
      return;
    }

    if (existing.userId !== req.user.id) {
      res.status(403).json({ message: 'Not authorized to delete this post' });
      return;
    }

    await prisma.bookPost.delete({ where: { id } });

    res.json({ message: 'Book post deleted' });
  } catch (error) {
    console.error('Delete book post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Like book post
router.post('/:id/like', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const bookPost = await prisma.bookPost.update({
      where: { id },
      data: { likes: { increment: 1 } }
    });

    res.json({ likes: bookPost.likes });
  } catch (error) {
    console.error('Like book post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Track share
router.post('/:id/share', async (req, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const bookPost = await prisma.bookPost.update({
      where: { id },
      data: { shares: { increment: 1 } }
    });

    res.json({ shares: bookPost.shares });
  } catch (error) {
    console.error('Share book post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
