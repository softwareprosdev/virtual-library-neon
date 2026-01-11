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

// Enhanced affiliate URL handler
const appendAffiliateTag = (url: string | null | undefined, platform: string = 'amazon') => {
  if (!url) return url;
  
  const amazonTag = process.env.AMAZON_ASSOCIATE_TAG || 'indexbin-20';
  
  // Handle Amazon URLs
  if (url.match(/amazon\.|amzn\./)) {
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.set('tag', amazonTag);
      return urlObj.toString();
    } catch (e) {
      return url;
    }
  }
  
  // Handle other platforms (add more as needed)
  if (platform === 'barnesandnoble' && url.includes('barnesandnoble.com')) {
    try {
      const urlObj = new URL(url);
      // Add B&N affiliate tracking if configured
      const bnTag = process.env.BARNES_NOBLE_TAG;
      if (bnTag) {
        urlObj.searchParams.set('trackingid', bnTag);
      }
      return urlObj.toString();
    } catch (e) {
      return url;
    }
  }
  
  return url;
};

// Extract ASIN from Amazon URL
const extractASIN = (url: string): string | null => {
  const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})|\/product\/([A-Z0-9]{10})|ASIN=([A-Z0-9]{10})/i);
  return asinMatch ? (asinMatch[1] || asinMatch[2] || asinMatch[3]) : null;
};

// Detect platform from URL
const detectPlatform = (url: string): string => {
  if (url.match(/amazon\.|amzn\./)) return 'amazon';
  if (url.includes('barnesandnoble.com')) return 'barnesandnoble';
  if (url.includes('kobo.com')) return 'kobo';
  if (url.includes('books.google.com')) return 'googlebooks';
  return 'other';
};

// Create book post
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { 
      title, 
      description, 
      coverUrl, 
      purchaseUrl, 
      previewUrl, 
      genre, 
      publishedDate,
      asin,
      isbn,
      author,
      price,
      currency,
      platform,
      isAuthorOwn
    } = req.body;

    if (!title || !description) {
      res.status(400).json({ message: 'Title and description are required' });
      return;
    }

    // Auto-detect platform and extract ASIN if not provided
    const detectedPlatform = platform || (purchaseUrl ? detectPlatform(purchaseUrl) : null);
    const detectedAsin = asin || (purchaseUrl && detectedPlatform === 'amazon' ? extractASIN(purchaseUrl) : null);
    const affiliateUrl = appendAffiliateTag(purchaseUrl, detectedPlatform);

    const bookPost = await prisma.bookPost.create({
      data: {
        userId: req.user.id,
        title,
        description,
        coverUrl,
        purchaseUrl,
        previewUrl,
        genre,
        publishedDate: publishedDate ? new Date(publishedDate) : null,
        // Amazon and affiliate fields
        asin: detectedAsin,
        isbn,
        author,
        price: price ? parseFloat(price) : null,
        currency: currency || 'USD',
        platform: detectedPlatform,
        isAuthorOwn: isAuthorOwn || false,
        affiliateUrl
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

// Track affiliate link click
router.post('/:id/click', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const bookPost = await prisma.bookPost.update({
      where: { id },
      data: { clickCount: { increment: 1 } }
    });

    if (!bookPost) {
      res.status(404).json({ message: 'Book post not found' });
      return;
    }

    res.json({ success: true, clickCount: bookPost.clickCount });
  } catch (error) {
    console.error('Track click error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Amazon product lookup (optional - for auto-filling book details)
router.post('/lookup/amazon', async (req: Request, res: Response): Promise<void> => {
  try {
    const { asin, url } = req.body;

    if (!asin && !url) {
      res.status(400).json({ message: 'ASIN or Amazon URL is required' });
      return;
    }

    const targetAsin = asin || (url ? extractASIN(url) : null);
    
    if (!targetAsin) {
      res.status(400).json({ message: 'Could not extract ASIN from the provided URL' });
      return;
    }

    // For now, return basic info. In production, you'd use Amazon Product Advertising API
    res.json({
      asin: targetAsin,
      message: 'Amazon Product Advertising API integration needed for full details'
    });

  } catch (error) {
    console.error('Amazon lookup error:', error);
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
