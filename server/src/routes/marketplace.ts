import { Router, Response, Request } from 'express';
import prisma from '../db';
import { AuthRequest, authenticateToken } from '../middlewares/auth';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const multer = require('multer');
import path from 'path';
import { S3Client } from '@aws-sdk/client-s3';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const multerS3 = require('multer-s3');

// File interface for multer uploads
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination?: string;
  filename?: string;
  path?: string;
  buffer?: Buffer;
  location?: string; // S3 location
}

// Extend AuthRequest to include file from multer
interface AuthRequestWithFile extends AuthRequest {
  file?: MulterFile;
}

const router = Router();

// Configure Storage (S3 or Local)
const isS3Enabled = !!process.env.AWS_S3_BUCKET;
let storage;

if (isS3Enabled) {
  const s3Config: any = {
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
    }
  };

  if (process.env.AWS_ENDPOINT) {
    s3Config.endpoint = process.env.AWS_ENDPOINT;
    s3Config.forcePathStyle = true;
  }

  const s3 = new S3Client(s3Config);

  storage = multerS3({
    s3: s3,
    bucket: process.env.AWS_S3_BUCKET!,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req: Request, file: MulterFile, cb: (error: Error | null, key?: string) => void) {
      cb(null, `marketplace/${Date.now()}-${file.originalname}`);
    }
  });
} else {
  storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req: Request, file: MulterFile, cb: (error: Error | null, filename: string) => void) => {
      cb(null, `market-${Date.now()}-${file.originalname}`);
    }
  });
}

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for marketplace images
  fileFilter: (req: Request, file: MulterFile, cb: (error: Error | null, acceptFile: boolean) => void) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error("Only images are allowed"), false);
  }
});

const LISTING_CATEGORIES = [
  'Books',
  'Electronics',
  'Clothing',
  'Home & Garden',
  'Sports',
  'Toys & Games',
  'Vehicles',
  'Other'
];

// Upload Image
router.post('/upload', authenticateToken, upload.single('image'), async (req: AuthRequestWithFile, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.sendStatus(401);
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fileLocation = (req.file as any).location;
    const fileUrl = fileLocation || `/uploads/${req.file.filename}`;

    res.json({ url: fileUrl });
  } catch (error) {
    console.error("Marketplace Upload Error:", error);
    res.status(500).json({ message: "Upload failed" });
  }
});

// Get all active listings
router.get('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category, search, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      status: 'ACTIVE'
    };

    if (category && category !== 'all') {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [listings, total] = await Promise.all([
      prisma.marketplaceListing.findMany({
        where,
        include: {
          seller: {
            select: {
              id: true,
              name: true,
              displayName: true,
              avatarUrl: true,
              location: true
            }
          },
          _count: {
            select: { savedBy: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.marketplaceListing.count({ where })
    ]);

    res.json({
      listings,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      categories: LISTING_CATEGORIES
    });
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({ message: 'Failed to fetch listings' });
  }
});

// Get single listing
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const listing = await prisma.marketplaceListing.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true,
            location: true,
            createdAt: true
          }
        },
        _count: {
          select: { savedBy: true }
        }
      }
    });

    if (!listing) {
      res.status(404).json({ message: 'Listing not found' });
      return;
    }

    // Increment view count
    await prisma.marketplaceListing.update({
      where: { id },
      data: { viewCount: { increment: 1 } }
    });

    // Check if user has saved this listing
    const isSaved = req.user ? await prisma.marketplaceSave.findUnique({
      where: {
        userId_listingId: {
          userId: req.user.id,
          listingId: id
        }
      }
    }) : null;

    res.json({ ...listing, isSaved: !!isSaved });
  } catch (error) {
    console.error('Error fetching listing:', error);
    res.status(500).json({ message: 'Failed to fetch listing' });
  }
});

// Create listing
router.post('/', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.sendStatus(401);
      return;
    }

    const { title, description, price, category, condition, images, location } = req.body;

    if (!title || !description || price === undefined || !category) {
      res.status(400).json({ message: 'Title, description, price, and category are required' });
      return;
    }

    if (price < 0) {
      res.status(400).json({ message: 'Price must be non-negative' });
      return;
    }

    if (!LISTING_CATEGORIES.includes(category)) {
      res.status(400).json({ message: 'Invalid category' });
      return;
    }

    const listing = await prisma.marketplaceListing.create({
      data: {
        sellerId: req.user.id,
        title: String(title).substring(0, 200),
        description: String(description).substring(0, 5000),
        price: Number(price),
        category,
        condition: condition || 'GOOD',
        images: Array.isArray(images) ? images.slice(0, 10) : [],
        location: location ? String(location).substring(0, 100) : null
      },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true
          }
        }
      }
    });

    res.status(201).json(listing);
  } catch (error) {
    console.error('Error creating listing:', error);
    res.status(500).json({ message: 'Failed to create listing' });
  }
});

// Update listing
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.sendStatus(401);
      return;
    }

    const { id } = req.params;
    const { title, description, price, category, condition, images, location, status } = req.body;

    const listing = await prisma.marketplaceListing.findUnique({
      where: { id }
    });

    if (!listing) {
      res.status(404).json({ message: 'Listing not found' });
      return;
    }

    if (listing.sellerId !== req.user.id) {
      res.status(403).json({ message: 'You can only edit your own listings' });
      return;
    }

    const updated = await prisma.marketplaceListing.update({
      where: { id },
      data: {
        ...(title && { title: String(title).substring(0, 200) }),
        ...(description && { description: String(description).substring(0, 5000) }),
        ...(price !== undefined && { price: Number(price) }),
        ...(category && LISTING_CATEGORIES.includes(category) && { category }),
        ...(condition && { condition }),
        ...(images && { images: Array.isArray(images) ? images.slice(0, 10) : listing.images }),
        ...(location !== undefined && { location: location ? String(location).substring(0, 100) : null }),
        ...(status && ['ACTIVE', 'SOLD', 'RESERVED', 'DELETED'].includes(status) && { status })
      },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true
          }
        }
      }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating listing:', error);
    res.status(500).json({ message: 'Failed to update listing' });
  }
});

// Delete listing
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.sendStatus(401);
      return;
    }

    const { id } = req.params;

    const listing = await prisma.marketplaceListing.findUnique({
      where: { id }
    });

    if (!listing) {
      res.status(404).json({ message: 'Listing not found' });
      return;
    }

    if (listing.sellerId !== req.user.id) {
      res.status(403).json({ message: 'You can only delete your own listings' });
      return;
    }

    await prisma.marketplaceListing.delete({
      where: { id }
    });

    res.json({ message: 'Listing deleted successfully' });
  } catch (error) {
    console.error('Error deleting listing:', error);
    res.status(500).json({ message: 'Failed to delete listing' });
  }
});

// Save/unsave listing
router.post('/:id/save', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.sendStatus(401);
      return;
    }

    const { id } = req.params;

    const existing = await prisma.marketplaceSave.findUnique({
      where: {
        userId_listingId: {
          userId: req.user.id,
          listingId: id
        }
      }
    });

    if (existing) {
      // Unsave
      await prisma.marketplaceSave.delete({
        where: { id: existing.id }
      });
      res.json({ saved: false });
    } else {
      // Save
      await prisma.marketplaceSave.create({
        data: {
          userId: req.user.id,
          listingId: id
        }
      });
      res.json({ saved: true });
    }
  } catch (error) {
    console.error('Error saving listing:', error);
    res.status(500).json({ message: 'Failed to save listing' });
  }
});

// Get user's listings
router.get('/user/:userId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const listings = await prisma.marketplaceListing.findMany({
      where: {
        sellerId: userId,
        status: { not: 'DELETED' }
      },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true
          }
        },
        _count: {
          select: { savedBy: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ listings });
  } catch (error) {
    console.error('Error fetching user listings:', error);
    res.status(500).json({ message: 'Failed to fetch user listings' });
  }
});

// Get user's saved listings
router.get('/saved/me', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.sendStatus(401);
      return;
    }

    const saved = await prisma.marketplaceSave.findMany({
      where: { userId: req.user.id },
      include: {
        listing: {
          include: {
            seller: {
              select: {
                id: true,
                name: true,
                displayName: true,
                avatarUrl: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ listings: saved.map(s => s.listing) });
  } catch (error) {
    console.error('Error fetching saved listings:', error);
    res.status(500).json({ message: 'Failed to fetch saved listings' });
  }
});

export default router;
