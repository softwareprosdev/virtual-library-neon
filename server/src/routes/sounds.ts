import { Router, Response, Request } from 'express';
import prisma from '../db';
import { AuthRequest, authenticateToken } from '../middlewares/auth';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const multer = require('multer');
import path from 'path';
import { S3Client } from '@aws-sdk/client-s3';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const multerS3 = require('multer-s3');

interface AuthRequestWithFile extends AuthRequest {
  file?: Express.Multer.File;
}

const router = Router();

// Configure Storage (S3 or Local)
const isS3Enabled = !!process.env.AWS_S3_BUCKET;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let storage: any;

if (isS3Enabled) {
  const s3Config: {
    region: string;
    credentials: { accessKeyId: string; secretAccessKey: string };
    endpoint?: string;
    forcePathStyle?: boolean;
  } = {
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
    key: function (req: Request, file: Express.Multer.File, cb: (error: Error | null, key?: string) => void) {
      cb(null, `sounds/${Date.now()}-${file.originalname}`);
    }
  });
} else {
  storage = multer.diskStorage({
    destination: 'uploads/sounds/',
    filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
      cb(null, `sound-${Date.now()}-${file.originalname}`);
    }
  });
}

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit for audio
  fileFilter: (req: Request, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
    const filetypes = /mp3|wav|m4a|aac|ogg|webm/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /audio\//.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error("Only audio files are allowed"), false);
  }
});

// Upload a new sound
router.post('/upload', authenticateToken, upload.single('audio'), async (req: AuthRequestWithFile, res: Response): Promise<void> => {
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
    const fileUrl = fileLocation || `/uploads/sounds/${req.file.filename}`;

    const { title, artistName, duration, coverUrl, originalVideoId } = req.body;

    if (!title) {
      res.status(400).json({ message: 'Title is required' });
      return;
    }

    const sound = await prisma.sound.create({
      data: {
        title,
        artistName: artistName || req.user.name || 'Unknown Artist',
        audioUrl: fileUrl,
        coverUrl,
        duration: parseInt(duration) || 0,
        isOriginal: !!originalVideoId,
        originalVideoId
      }
    });

    res.status(201).json(sound);
  } catch (error) {
    console.error("Sound Upload Error:", error);
    res.status(500).json({ message: "Upload failed" });
  }
});

// Get trending sounds
router.get('/trending', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { limit = '20' } = req.query;
    const take = parseInt(limit as string);

    const sounds = await prisma.sound.findMany({
      where: {
        OR: [
          { isTrending: true },
          { usageCount: { gte: 10 } }
        ]
      },
      orderBy: [
        { isTrending: 'desc' },
        { usageCount: 'desc' }
      ],
      take
    });

    res.json(sounds);
  } catch (error) {
    console.error('Get trending sounds error:', error);
    res.status(500).json({ message: 'Failed to get trending sounds' });
  }
});

// Search sounds
router.get('/search', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { q, cursor, limit = '20' } = req.query;
    const take = parseInt(limit as string);

    if (!q || typeof q !== 'string') {
      res.status(400).json({ message: 'Search query is required' });
      return;
    }

    const sounds = await prisma.sound.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { artistName: { contains: q, mode: 'insensitive' } }
        ]
      },
      orderBy: { usageCount: 'desc' },
      take: take + 1,
      ...(cursor && { cursor: { id: cursor as string }, skip: 1 })
    });

    const hasMore = sounds.length > take;
    const resultSounds = hasMore ? sounds.slice(0, -1) : sounds;

    res.json({
      sounds: resultSounds,
      nextCursor: hasMore ? resultSounds[resultSounds.length - 1]?.id : null
    });
  } catch (error) {
    console.error('Search sounds error:', error);
    res.status(500).json({ message: 'Failed to search sounds' });
  }
});

// Get a single sound
router.get('/:soundId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { soundId } = req.params;

    const sound = await prisma.sound.findUnique({
      where: { id: soundId },
      include: {
        _count: {
          select: { videos: true }
        }
      }
    });

    if (!sound) {
      res.status(404).json({ message: 'Sound not found' });
      return;
    }

    res.json({
      ...sound,
      videoCount: sound._count.videos
    });
  } catch (error) {
    console.error('Get sound error:', error);
    res.status(500).json({ message: 'Failed to get sound' });
  }
});

// Get videos using a specific sound
router.get('/:soundId/videos', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { soundId } = req.params;
    const { cursor, limit = '12' } = req.query;
    const take = parseInt(limit as string);

    // Get blocked users
    const blockedUsers = await prisma.userBlock.findMany({
      where: {
        OR: [
          { blockerId: req.user.id },
          { blockedId: req.user.id }
        ]
      }
    });
    const blockedIds = blockedUsers.map(b =>
      b.blockerId === req.user!.id ? b.blockedId : b.blockerId
    );

    const videos = await prisma.video.findMany({
      where: {
        soundId,
        visibility: 'PUBLIC',
        userId: { notIn: blockedIds },
        processingStatus: 'COMPLETED'
      },
      include: {
        user: {
          select: { id: true, name: true, displayName: true, avatarUrl: true }
        },
        likes: {
          where: { userId: req.user.id },
          select: { id: true }
        },
        _count: {
          select: { likes: true, views: true }
        }
      },
      orderBy: { engagementScore: 'desc' },
      take: take + 1,
      ...(cursor && { cursor: { id: cursor as string }, skip: 1 })
    });

    const hasMore = videos.length > take;
    const resultVideos = hasMore ? videos.slice(0, -1) : videos;

    const result = resultVideos.map(video => ({
      ...video,
      isLiked: video.likes.length > 0,
      likeCount: video._count.likes,
      viewCount: video._count.views
    }));

    res.json({
      videos: result,
      nextCursor: hasMore ? resultVideos[resultVideos.length - 1]?.id : null
    });
  } catch (error) {
    console.error('Get sound videos error:', error);
    res.status(500).json({ message: 'Failed to get videos' });
  }
});

// Get recently used sounds by current user
router.get('/user/recent', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { limit = '10' } = req.query;
    const take = parseInt(limit as string);

    // Get sounds from user's recent videos
    const recentVideos = await prisma.video.findMany({
      where: {
        userId: req.user.id,
        soundId: { not: null }
      },
      select: {
        soundId: true
      },
      orderBy: { createdAt: 'desc' },
      take: take * 2 // Get more to filter duplicates
    });

    const soundIds = [...new Set(recentVideos.map(v => v.soundId).filter(Boolean))] as string[];

    if (soundIds.length === 0) {
      res.json([]);
      return;
    }

    const sounds = await prisma.sound.findMany({
      where: {
        id: { in: soundIds.slice(0, take) }
      }
    });

    res.json(sounds);
  } catch (error) {
    console.error('Get recent sounds error:', error);
    res.status(500).json({ message: 'Failed to get recent sounds' });
  }
});

// Mark sound as used (increment usage count)
router.post('/:soundId/use', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { soundId } = req.params;

    const sound = await prisma.sound.update({
      where: { id: soundId },
      data: {
        usageCount: { increment: 1 }
      }
    });

    // Automatically mark as trending if usage count exceeds threshold
    if (sound.usageCount >= 100 && !sound.isTrending) {
      await prisma.sound.update({
        where: { id: soundId },
        data: { isTrending: true }
      });
    }

    res.json({ usageCount: sound.usageCount });
  } catch (error) {
    console.error('Use sound error:', error);
    res.status(500).json({ message: 'Failed to update sound usage' });
  }
});

// Get favorite/saved sounds (based on usage in user's videos)
router.get('/favorites/list', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Get sounds most used by this user
    const userVideos = await prisma.video.findMany({
      where: {
        userId: req.user.id,
        soundId: { not: null }
      },
      select: { soundId: true }
    });

    const soundCounts = userVideos.reduce((acc, v) => {
      if (v.soundId) {
        acc[v.soundId] = (acc[v.soundId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const sortedSoundIds = Object.entries(soundCounts)
      .sort(([, a]: [string, number], [, b]: [string, number]) => b - a)
      .slice(0, 20)
      .map(([id]) => id);

    if (sortedSoundIds.length === 0) {
      res.json([]);
      return;
    }

    const sounds = await prisma.sound.findMany({
      where: {
        id: { in: sortedSoundIds }
      }
    });

    // Sort to match the order of sortedSoundIds
    const orderedSounds = sortedSoundIds.map(id => sounds.find(s => s.id === id)).filter(Boolean);

    res.json(orderedSounds);
  } catch (error) {
    console.error('Get favorite sounds error:', error);
    res.status(500).json({ message: 'Failed to get favorite sounds' });
  }
});

export default router;
