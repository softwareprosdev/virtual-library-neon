import { Router, Response, Request } from 'express';
import prisma from '../db';
import { AuthRequest, authenticateToken } from '../middlewares/auth';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const multer = require('multer');
import path from 'path';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const multerS3 = require('multer-s3');
import muxService from '../services/muxService';
import pexelsService from '../services/pexelsService';

interface AuthRequestWithFile extends AuthRequest {
  file?: Express.Multer.File;
}

const router = Router();

// Helper to ensure videoId is a string
const getVideoId = (req: Request): string => {
  const { videoId } = req.params;
  return Array.isArray(videoId) ? videoId[0] : videoId;
};

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
      cb(null, `videos/${Date.now()}-${file.originalname}`);
    }
  });
} else {
  storage = multer.diskStorage({
    destination: 'uploads/videos/',
    filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
      cb(null, `video-${Date.now()}-${file.originalname}`);
    }
  });
}

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit for videos
  fileFilter: (req: Request, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
    const filetypes = /mp4|webm|mov|avi|mkv|m4v/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /video\//.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error("Only video files are allowed"), false);
  }
});

// Upload video
router.post('/upload', authenticateToken, upload.single('video'), async (req: AuthRequestWithFile, res: Response): Promise<void> => {
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
    const fileUrl = fileLocation || `/uploads/videos/${req.file.filename}`;

    const { caption, hashtags, mentions, visibility, allowDuet, allowStitch, allowComments, soundId, duration, category } = req.body;

    // Extract hashtags from caption
    const hashtagRegex = /#(\w+)/g;
    const extractedHashtags = caption
      ? [...caption.matchAll(hashtagRegex)].map((match: RegExpMatchArray) => match[1].toLowerCase())
      : [];
    const allHashtags = [...new Set([...extractedHashtags, ...(hashtags || [])])];

    // Extract mentions from caption
    const mentionRegex = /@(\w+)/g;
    const mentionedNames = caption
      ? [...caption.matchAll(mentionRegex)].map((match: RegExpMatchArray) => match[1])
      : [];

    // Find mentioned users
    const mentionedUsers = mentionedNames.length > 0 ? await prisma.user.findMany({
      where: {
        OR: [
          { name: { in: mentionedNames, mode: 'insensitive' } },
          { displayName: { in: mentionedNames, mode: 'insensitive' } }
        ]
      },
      select: { id: true }
    }) : [];

    const mentionIds = [...new Set([...mentionedUsers.map(u => u.id), ...(mentions || [])])];

    // Create video record with PENDING processing status
    const video = await prisma.video.create({
      data: {
        userId: req.user.id,
        videoUrl: fileUrl,
        duration: parseInt(duration) || 0,
        caption,
        hashtags: allHashtags,
        mentions: mentionIds,
        visibility: visibility || 'PUBLIC',
        allowDuet: allowDuet !== 'false',
        allowStitch: allowStitch !== 'false',
        allowComments: allowComments !== 'false',
        soundId: soundId || null,
        category: category || 'OTHER',
        processingStatus: 'COMPLETED' // For now, mark as completed since we're not doing server-side processing
      },
      include: {
        user: {
          select: { id: true, name: true, displayName: true, avatarUrl: true }
        }
      }
    });

    // Update hashtag counts
    for (const tag of allHashtags) {
      await prisma.hashtag.upsert({
        where: { name: tag },
        create: { name: tag, postCount: 1 },
        update: { postCount: { increment: 1 } }
      });
    }

    // Create notifications for mentioned users
    for (const userId of mentionIds) {
      if (userId !== req.user.id) {
        await prisma.notification.create({
          data: {
            userId,
            actorId: req.user.id,
            type: 'VIDEO_MENTION',
            title: 'You were tagged',
            body: 'tagged you in a video',
            data: { videoId: video.id }
          }
        });
      }
    }

    // Create activity
    await prisma.activity.create({
      data: {
        userId: req.user.id,
        type: 'CREATE_VIDEO',
        details: JSON.stringify({ videoId: video.id })
      }
    });

    res.status(201).json(video);
  } catch (error) {
    console.error("Video Upload Error:", error);
    res.status(500).json({ message: "Upload failed" });
  }
});

// Get For You Page feed (FYP) - includes stock videos when user content is limited
router.get('/fyp', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { cursor, limit = '10', page = '1' } = req.query;
    const take = parseInt(limit as string);
    const pageNum = parseInt(page as string);

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

    // FYP Algorithm: Mix of engagement score, recency, and user interests
    const videos = await prisma.video.findMany({
      where: {
        visibility: 'PUBLIC',
        userId: { notIn: blockedIds },
        processingStatus: 'COMPLETED'
      },
      include: {
        user: {
          select: { id: true, name: true, displayName: true, avatarUrl: true }
        },
        sound: {
          select: { id: true, title: true, artistName: true, coverUrl: true }
        },
        likes: {
          where: { userId: req.user.id },
          select: { id: true }
        },
        bookmarks: {
          where: { userId: req.user.id },
          select: { id: true }
        },
        _count: {
          select: { likes: true, comments: true, shares: true, views: true }
        }
      },
      orderBy: [
        { engagementScore: 'desc' },
        { createdAt: 'desc' }
      ],
      take: take + 1,
      ...(cursor && { cursor: { id: cursor as string }, skip: 1 })
    });

    const hasMoreUserVideos = videos.length > take;
    const userVideos = hasMoreUserVideos ? videos.slice(0, -1) : videos;

    // Transform user videos
    const transformedUserVideos = userVideos.map(video => ({
      ...video,
      source: 'user' as const,
      isLiked: video.likes.length > 0,
      isBookmarked: video.bookmarks.length > 0,
      likeCount: video._count.likes,
      commentCount: video._count.comments,
      shareCount: video._count.shares,
      viewCount: video._count.views
    }));

    // If we have fewer than requested videos, fill with Pexels stock videos
    let result = transformedUserVideos;
    let hasMore = hasMoreUserVideos;
    let nextCursor = hasMoreUserVideos ? userVideos[userVideos.length - 1]?.id : null;

    if (transformedUserVideos.length < take) {
      const neededStockVideos = take - transformedUserVideos.length;
      const stockVideos = await pexelsService.getMixedFeed(pageNum, neededStockVideos);

      // Mix user videos with stock videos
      result = [...transformedUserVideos, ...stockVideos];

      // If we got stock videos, there might be more
      hasMore = stockVideos.length === neededStockVideos;
      if (!nextCursor && hasMore) {
        nextCursor = `pexels-page-${pageNum + 1}`;
      }
    }

    res.json({
      videos: result,
      nextCursor,
      hasMore
    });
  } catch (error) {
    console.error('Get FYP error:', error);
    res.status(500).json({ message: 'Failed to get FYP feed' });
  }
});

// Get stock videos from Pexels (for discover/explore)
router.get('/stock', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '10', category, query } = req.query;
    const pageNum = parseInt(page as string);
    const perPage = parseInt(limit as string);

    let videos;
    if (query && typeof query === 'string') {
      // Search videos
      videos = await pexelsService.searchVideos(query, pageNum, perPage, 'portrait');
    } else if (category && typeof category === 'string') {
      // Get curated category videos
      const validCategories = ['trending', 'nature', 'technology', 'lifestyle', 'food', 'travel'] as const;
      const cat = validCategories.includes(category as any) ? category as typeof validCategories[number] : 'trending';
      videos = await pexelsService.getCuratedVideos(cat, pageNum, perPage);
    } else {
      // Get popular videos
      videos = await pexelsService.getPopularVideos(pageNum, perPage);
    }

    res.json({
      videos,
      page: pageNum,
      hasMore: videos.length === perPage
    });
  } catch (error) {
    console.error('Get stock videos error:', error);
    res.status(500).json({ message: 'Failed to get stock videos' });
  }
});

// Get videos by category (user videos + stock videos)
router.get('/category/:category', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { category } = req.params;
    const categoryParam = Array.isArray(category) ? category[0] : category;
    const { cursor, limit = '10', page = '1' } = req.query;
    const take = parseInt(limit as string);
    const pageNum = parseInt(page as string);

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

    // Get user videos from this category
    const userVideos = await prisma.video.findMany({
      where: {
        category: categoryParam as any,
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
          select: { likes: true, comments: true, shares: true, views: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor && { cursor: { id: cursor as string }, skip: 1 })
    });

    const hasMoreUser = userVideos.length > take;
    const userResults = hasMoreUser ? userVideos.slice(0, -1) : userVideos;

    const transformedUserVideos = userResults.map(video => ({
      ...video,
      source: 'user' as const,
      isLiked: video.likes.length > 0,
      likeCount: video._count.likes,
      commentCount: video._count.comments,
      shareCount: video._count.shares,
      viewCount: video._count.views
    }));

    // If we need more videos, fill with Pexels stock
    let result = transformedUserVideos;
    let hasMore = hasMoreUser;

    if (transformedUserVideos.length < take) {
      const neededStock = take - transformedUserVideos.length;
      let stockVideos = [];

      // Map our categories to Pexels categories
      const pexelsCategoryMap: Record<string, string> = {
        'NATURE': 'nature',
        'TRAVEL': 'travel',
        'FOOD': 'food',
        'MUSIC': 'music',
        'SPORTS': 'sports',
        'TECH': 'technology',
        'FASHION': 'lifestyle'
      };

      const pexelsCategory = pexelsCategoryMap[categoryParam] || 'popular';

      try {
        stockVideos = await pexelsService.getCuratedVideos(pexelsCategory as any, pageNum, neededStock);
      } catch (error) {
        // Fallback to popular if category not available
        stockVideos = await pexelsService.getPopularVideos(pageNum, neededStock);
      }

      result = [...transformedUserVideos, ...stockVideos];
      hasMore = stockVideos.length === neededStock;
    }

    res.json({
      videos: result,
      nextCursor: hasMoreUser ? userResults[userResults.length - 1]?.id : null,
      hasMore
    });
  } catch (error) {
    console.error('Get category videos error:', error);
    res.status(500).json({ message: 'Failed to get category videos' });
  }
});

// Get following feed (videos from followed users)
router.get('/following', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { cursor, limit = '10' } = req.query;
    const take = parseInt(limit as string);

    // Get list of users the current user follows
    const following = await prisma.follows.findMany({
      where: { followerId: req.user.id },
      select: { followingId: true }
    });

    const followingIds = following.map(f => f.followingId);
    followingIds.push(req.user.id); // Include own videos

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
        userId: { in: followingIds, notIn: blockedIds },
        processingStatus: 'COMPLETED',
        OR: [
          { visibility: 'PUBLIC' },
          { visibility: 'FOLLOWERS_ONLY', userId: { in: followingIds } },
          { userId: req.user.id }
        ]
      },
      include: {
        user: {
          select: { id: true, name: true, displayName: true, avatarUrl: true }
        },
        sound: {
          select: { id: true, title: true, artistName: true, coverUrl: true }
        },
        likes: {
          where: { userId: req.user.id },
          select: { id: true }
        },
        bookmarks: {
          where: { userId: req.user.id },
          select: { id: true }
        },
        _count: {
          select: { likes: true, comments: true, shares: true, views: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor && { cursor: { id: cursor as string }, skip: 1 })
    });

    const hasMore = videos.length > take;
    const feedVideos = hasMore ? videos.slice(0, -1) : videos;

    const result = feedVideos.map(video => ({
      ...video,
      isLiked: video.likes.length > 0,
      isBookmarked: video.bookmarks.length > 0,
      likeCount: video._count.likes,
      commentCount: video._count.comments,
      shareCount: video._count.shares,
      viewCount: video._count.views
    }));

    res.json({
      videos: result,
      nextCursor: hasMore ? feedVideos[feedVideos.length - 1]?.id : null
    });
  } catch (error) {
    console.error('Get following feed error:', error);
    res.status(500).json({ message: 'Failed to get following feed' });
  }
});

// Get a single video
router.get('/:videoId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const videoId = getVideoId(req);

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        user: {
          select: { id: true, name: true, displayName: true, avatarUrl: true }
        },
        sound: {
          select: { id: true, title: true, artistName: true, coverUrl: true }
        },
        likes: {
          where: { userId: req.user.id },
          select: { id: true }
        },
        bookmarks: {
          where: { userId: req.user.id },
          select: { id: true }
        },
        _count: {
          select: { likes: true, comments: true, shares: true, views: true }
        }
      }
    });

    if (!video) {
      res.status(404).json({ message: 'Video not found' });
      return;
    }

    res.json({
      ...video,
      isLiked: video.likes.length > 0,
      isBookmarked: video.bookmarks.length > 0,
      likeCount: video._count.likes,
      commentCount: video._count.comments,
      shareCount: video._count.shares,
      viewCount: video._count.views
    });
  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({ message: 'Failed to get video' });
  }
});

// Like/unlike a video
router.post('/:videoId/like', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const videoId = getVideoId(req);

    const video = await prisma.video.findUnique({
      where: { id: videoId }
    });

    if (!video) {
      res.status(404).json({ message: 'Video not found' });
      return;
    }

    const existingLike = await prisma.videoLike.findUnique({
      where: {
        videoId_userId: {
          videoId,
          userId: req.user.id
        }
      }
    });

    if (existingLike) {
      // Unlike
      await prisma.videoLike.delete({
        where: { id: existingLike.id }
      });

      // Update engagement score
      await updateVideoEngagementScore(videoId);

      res.json({ liked: false });
    } else {
      // Like
      await prisma.videoLike.create({
        data: {
          videoId,
          userId: req.user.id
        }
      });

      // Update user interests
      await updateUserInterests(req.user.id, video.hashtags, 0.1);

      // Update engagement score
      await updateVideoEngagementScore(videoId);

      // Create notification
      if (video.userId !== req.user.id) {
        await prisma.notification.create({
          data: {
            userId: video.userId,
            actorId: req.user.id,
            type: 'VIDEO_LIKE',
            title: 'New Like',
            body: 'liked your video',
            data: { videoId }
          }
        });
      }

      res.json({ liked: true });
    }
  } catch (error) {
    console.error('Like video error:', error);
    res.status(500).json({ message: 'Failed to like video' });
  }
});

// Comment on a video
router.post('/:videoId/comment', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { videoId } = req.params;
    const { content, parentId } = req.body;

    if (!content?.trim()) {
      res.status(400).json({ message: 'Comment content is required' });
      return;
    }

    const video = await prisma.video.findUnique({
      where: { id: videoId }
    });

    if (!video) {
      res.status(404).json({ message: 'Video not found' });
      return;
    }

    if (!video.allowComments && video.userId !== req.user.id) {
      res.status(403).json({ message: 'Comments are disabled for this video' });
      return;
    }

    const comment = await prisma.videoComment.create({
      data: {
        videoId,
        userId: req.user.id,
        content,
        parentId
      },
      include: {
        user: {
          select: { id: true, name: true, displayName: true, avatarUrl: true }
        }
      }
    });

    // Update engagement score
    await updateVideoEngagementScore(getVideoId(req));

    // Create notification
    if (video.userId !== req.user.id) {
      await prisma.notification.create({
        data: {
          userId: video.userId,
          actorId: req.user.id,
          type: 'VIDEO_COMMENT',
          title: 'New Comment',
          body: 'commented on your video',
          data: { videoId, commentId: comment.id }
        }
      });
    }

    res.status(201).json(comment);
  } catch (error) {
    console.error('Comment on video error:', error);
    res.status(500).json({ message: 'Failed to add comment' });
  }
});

// Get video comments
router.get('/:videoId/comments', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { videoId } = req.params;
    const { cursor, limit = '20' } = req.query;
    const take = parseInt(limit as string);

    const comments = await prisma.videoComment.findMany({
      where: {
        videoId,
        parentId: null // Top-level comments only
      },
      include: {
        user: {
          select: { id: true, name: true, displayName: true, avatarUrl: true }
        },
        replies: {
          include: {
            user: {
              select: { id: true, name: true, displayName: true, avatarUrl: true }
            }
          },
          orderBy: { createdAt: 'asc' },
          take: 3
        },
        _count: {
          select: { replies: true }
        }
      },
      orderBy: [
        { likes: 'desc' },
        { createdAt: 'desc' }
      ],
      take: take + 1,
      ...(cursor && { cursor: { id: cursor as string }, skip: 1 })
    });

    const hasMore = comments.length > take;
    const resultComments = hasMore ? comments.slice(0, -1) : comments;

    res.json({
      comments: resultComments,
      nextCursor: hasMore ? resultComments[resultComments.length - 1]?.id : null
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Failed to get comments' });
  }
});

// Share a video
router.post('/:videoId/share', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { videoId } = req.params;
    const { platform } = req.body;

    const video = await prisma.video.findUnique({
      where: { id: videoId }
    });

    if (!video) {
      res.status(404).json({ message: 'Video not found' });
      return;
    }

    await prisma.videoShare.create({
      data: {
        videoId,
        userId: req.user.id,
        platform
      }
    });

    // Update engagement score
    await updateVideoEngagementScore(getVideoId(req));

    res.json({ shared: true });
  } catch (error) {
    console.error('Share video error:', error);
    res.status(500).json({ message: 'Failed to share video' });
  }
});

// Bookmark a video
router.post('/:videoId/bookmark', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { videoId } = req.params;

    const existingBookmark = await prisma.videoBookmark.findUnique({
      where: {
        videoId_userId: {
          videoId,
          userId: req.user.id
        }
      }
    });

    if (existingBookmark) {
      await prisma.videoBookmark.delete({
        where: { id: existingBookmark.id }
      });
      res.json({ bookmarked: false });
    } else {
      await prisma.videoBookmark.create({
        data: {
          videoId,
          userId: req.user.id
        }
      });
      res.json({ bookmarked: true });
    }
  } catch (error) {
    console.error('Bookmark video error:', error);
    res.status(500).json({ message: 'Failed to bookmark video' });
  }
});

// Record video view
router.post('/:videoId/view', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { videoId } = req.params;
    const { watchTime, completed } = req.body;

    const video = await prisma.video.findUnique({
      where: { id: videoId }
    });

    if (!video) {
      res.status(404).json({ message: 'Video not found' });
      return;
    }

    // Create or update view
    await prisma.videoView.create({
      data: {
        videoId,
        userId: req.user?.id,
        watchTime: parseInt(watchTime) || 0,
        completed: completed === true
      }
    });

    // Update user interests based on watch time
    if (req.user && watchTime > 5) {
      const score = Math.min(watchTime / video.duration, 1) * 0.2;
      await updateUserInterests(req.user.id, video.hashtags as string[], score);
    }

    // Update engagement score
    await updateVideoEngagementScore(getVideoId(req));

    res.json({ viewed: true });
  } catch (error) {
    console.error('Record view error:', error);
    res.status(500).json({ message: 'Failed to record view' });
  }
});

// Get bookmarked videos
router.get('/bookmarks/list', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { cursor, limit = '12' } = req.query;
    const take = parseInt(limit as string);

    const bookmarks = await prisma.videoBookmark.findMany({
      where: { userId: req.user.id },
      include: {
        video: {
          include: {
            user: {
              select: { id: true, name: true, displayName: true, avatarUrl: true }
            },
            _count: {
              select: { likes: true, comments: true, views: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor && { cursor: { id: cursor as string }, skip: 1 })
    });

    const hasMore = bookmarks.length > take;
    const resultBookmarks = hasMore ? bookmarks.slice(0, -1) : bookmarks;

    const result = resultBookmarks.map(b => ({
      ...b.video,
      isBookmarked: true,
      likeCount: b.video._count.likes,
      commentCount: b.video._count.comments,
      viewCount: b.video._count.views,
      bookmarkedAt: b.createdAt
    }));

    res.json({
      videos: result,
      nextCursor: hasMore ? resultBookmarks[resultBookmarks.length - 1]?.id : null
    });
  } catch (error) {
    console.error('Get bookmarked videos error:', error);
    res.status(500).json({ message: 'Failed to get bookmarks' });
  }
});

// Create duet
router.post('/duet/:sourceId', authenticateToken, upload.single('video'), async (req: AuthRequestWithFile, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.sendStatus(401);
      return;
    }

    const { sourceId } = req.params;

    const sourceVideo = await prisma.video.findUnique({
      where: { id: sourceId }
    });

    if (!sourceVideo) {
      res.status(404).json({ message: 'Source video not found' });
      return;
    }

    if (!sourceVideo.allowDuet) {
      res.status(403).json({ message: 'Duets are not allowed for this video' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fileLocation = (req.file as any).location;
    const fileUrl = fileLocation || `/uploads/videos/${req.file.filename}`;

    const { caption, duration } = req.body;

    const duet = await prisma.video.create({
      data: {
        userId: req.user.id,
        videoUrl: fileUrl,
        duration: parseInt(duration) || 0,
        caption,
        duetSourceId: sourceId,
        soundId: sourceVideo.soundId,
        processingStatus: 'COMPLETED'
      },
      include: {
        user: {
          select: { id: true, name: true, displayName: true, avatarUrl: true }
        },
        duetSource: {
          select: { id: true, user: { select: { id: true, name: true, displayName: true } } }
        }
      }
    });

    // Notify source video owner
    if (sourceVideo.userId !== req.user.id) {
      await prisma.notification.create({
        data: {
          userId: sourceVideo.userId,
          actorId: req.user.id,
          type: 'VIDEO_DUET',
          title: 'New Duet',
          body: 'created a duet with your video',
          data: { videoId: duet.id, sourceVideoId: sourceId }
        }
      });
    }

    res.status(201).json(duet);
  } catch (error) {
    console.error('Create duet error:', error);
    res.status(500).json({ message: 'Failed to create duet' });
  }
});

// Create stitch
router.post('/stitch/:sourceId', authenticateToken, upload.single('video'), async (req: AuthRequestWithFile, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.sendStatus(401);
      return;
    }

    const { sourceId } = req.params;

    const sourceVideo = await prisma.video.findUnique({
      where: { id: sourceId }
    });

    if (!sourceVideo) {
      res.status(404).json({ message: 'Source video not found' });
      return;
    }

    if (!sourceVideo.allowStitch) {
      res.status(403).json({ message: 'Stitches are not allowed for this video' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fileLocation = (req.file as any).location;
    const fileUrl = fileLocation || `/uploads/videos/${req.file.filename}`;

    const { caption, duration } = req.body;

    const stitch = await prisma.video.create({
      data: {
        userId: req.user.id,
        videoUrl: fileUrl,
        duration: parseInt(duration) || 0,
        caption,
        stitchSourceId: sourceId,
        processingStatus: 'COMPLETED'
      },
      include: {
        user: {
          select: { id: true, name: true, displayName: true, avatarUrl: true }
        },
        stitchSource: {
          select: { id: true, user: { select: { id: true, name: true, displayName: true } } }
        }
      }
    });

    // Notify source video owner
    if (sourceVideo.userId !== req.user.id) {
      await prisma.notification.create({
        data: {
          userId: sourceVideo.userId,
          actorId: req.user.id,
          type: 'VIDEO_STITCH',
          title: 'New Stitch',
          body: 'stitched your video',
          data: { videoId: stitch.id, sourceVideoId: sourceId }
        }
      });
    }

    res.status(201).json(stitch);
  } catch (error) {
    console.error('Create stitch error:', error);
    res.status(500).json({ message: 'Failed to create stitch' });
  }
});

// Get trending videos
router.get('/trending/list', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { limit = '20' } = req.query;
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

    // Trending = high engagement in the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const videos = await prisma.video.findMany({
      where: {
        visibility: 'PUBLIC',
        userId: { notIn: blockedIds },
        processingStatus: 'COMPLETED',
        createdAt: { gte: oneDayAgo }
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
          select: { likes: true, comments: true, shares: true, views: true }
        }
      },
      orderBy: { engagementScore: 'desc' },
      take
    });

    const result = videos.map(video => ({
      ...video,
      isLiked: video.likes.length > 0,
      likeCount: video._count.likes,
      commentCount: video._count.comments,
      shareCount: video._count.shares,
      viewCount: video._count.views
    }));

    res.json(result);
  } catch (error) {
    console.error('Get trending videos error:', error);
    res.status(500).json({ message: 'Failed to get trending videos' });
  }
});

// Delete a video
router.delete('/:videoId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { videoId } = req.params;

    const video = await prisma.video.findUnique({
      where: { id: videoId }
    });

    if (!video) {
      res.status(404).json({ message: 'Video not found' });
      return;
    }

    if (video.userId !== req.user.id) {
      res.status(403).json({ message: 'Not authorized to delete this video' });
      return;
    }

    // Decrement hashtag counts
    for (const tag of video.hashtags) {
      await prisma.hashtag.updateMany({
        where: { name: tag, postCount: { gt: 0 } },
        data: { postCount: { decrement: 1 } }
      });
    }

    await prisma.video.delete({
      where: { id: videoId }
    });

    res.json({ message: 'Video deleted' });
  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({ message: 'Failed to delete video' });
  }
});

// Helper function to update video engagement score
async function updateVideoEngagementScore(videoId: string) {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: {
      _count: {
        select: { likes: true, comments: true, shares: true, views: true }
      }
    }
  });

  if (!video) return;

  // Engagement score formula:
  // - Likes: weight 1
  // - Comments: weight 2
  // - Shares: weight 3
  // - Views: weight 0.1
  // Normalized by time (newer videos get a boost)
  const ageInHours = (Date.now() - video.createdAt.getTime()) / (1000 * 60 * 60);
  const timeFactor = Math.max(0.1, 1 - (ageInHours / 168)); // Decay over a week

  const rawScore =
    video._count.likes * 1 +
    video._count.comments * 2 +
    video._count.shares * 3 +
    video._count.views * 0.1;

  const engagementScore = rawScore * timeFactor;

  await prisma.video.update({
    where: { id: videoId },
    data: { engagementScore }
  });
}

// Helper function to update user interests
async function updateUserInterests(userId: string, hashtags: string[], scoreChange: number) {
  // Map hashtags to categories (simplified version)
  const categoryMap: Record<string, string> = {
    // Books
    'books': 'books', 'reading': 'books', 'booktok': 'books', 'bookish': 'books',
    // Comedy
    'funny': 'comedy', 'comedy': 'comedy', 'humor': 'comedy', 'lol': 'comedy',
    // Education
    'learn': 'education', 'tutorial': 'education', 'howto': 'education', 'tips': 'education',
    // Music
    'music': 'music', 'song': 'music', 'dance': 'music', 'singing': 'music',
    // Food
    'food': 'food', 'cooking': 'food', 'recipe': 'food', 'foodie': 'food',
    // Lifestyle
    'lifestyle': 'lifestyle', 'vlog': 'lifestyle', 'life': 'lifestyle',
    // Tech
    'tech': 'tech', 'coding': 'tech', 'programming': 'tech', 'developer': 'tech'
  };

  const categories = new Set<string>();
  for (const tag of hashtags) {
    const category = categoryMap[tag.toLowerCase()];
    if (category) categories.add(category);
  }

  for (const category of categories) {
    await prisma.userInterest.upsert({
      where: {
        userId_category: { userId, category }
      },
      create: {
        userId,
        category,
        score: Math.min(1, Math.max(-1, scoreChange))
      },
      update: {
        score: {
          increment: scoreChange
        }
      }
    });

    // Clamp score between -1 and 1
    await prisma.userInterest.updateMany({
      where: { userId, category, score: { gt: 1 } },
      data: { score: 1 }
    });
    await prisma.userInterest.updateMany({
      where: { userId, category, score: { lt: -1 } },
      data: { score: -1 }
    });
  }
}

// ============================================
// MUX VIDEO INTEGRATION
// ============================================

// Create a direct upload URL for Mux
router.post('/mux/upload-url', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    // Check if Mux is configured
    if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
      res.status(503).json({ message: 'Video upload service not configured' });
      return;
    }

    const upload = await muxService.createDirectUpload();
    res.json(upload);
  } catch (error) {
    console.error('Error creating Mux upload URL:', error);
    res.status(500).json({ message: 'Failed to create upload URL' });
  }
});

// Create video from Mux upload
router.post('/mux/create', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { uploadId, caption, hashtags, mentions, visibility, allowDuet, allowStitch, allowComments, soundId, category } = req.body;

    if (!uploadId) {
      res.status(400).json({ message: 'Upload ID is required' });
      return;
    }

    // Check upload status
    const uploadStatus = await muxService.getUploadStatus(uploadId);
    if (uploadStatus.status !== 'asset_created' || !uploadStatus.assetId) {
      res.status(400).json({
        message: 'Upload not complete',
        status: uploadStatus.status
      });
      return;
    }

    // Get asset details from Mux
    const asset = await muxService.getAsset(uploadStatus.assetId);
    if (!asset) {
      res.status(400).json({ message: 'Failed to get video details' });
      return;
    }

    // Extract hashtags from caption
    const hashtagRegex = /#(\w+)/g;
    const extractedHashtags = caption
      ? [...caption.matchAll(hashtagRegex)].map((match: RegExpMatchArray) => match[1].toLowerCase())
      : [];
    const allHashtags = [...new Set([...extractedHashtags, ...(hashtags || [])])];

    // Extract mentions from caption
    const mentionRegex = /@(\w+)/g;
    const mentionedNames = caption
      ? [...caption.matchAll(mentionRegex)].map((match: RegExpMatchArray) => match[1])
      : [];

    // Find mentioned users
    const mentionedUsers = mentionedNames.length > 0 ? await prisma.user.findMany({
      where: {
        OR: [
          { name: { in: mentionedNames, mode: 'insensitive' } },
          { displayName: { in: mentionedNames, mode: 'insensitive' } }
        ]
      },
      select: { id: true }
    }) : [];

    const mentionIds = [...new Set([...mentionedUsers.map(u => u.id), ...(mentions || [])])];

    // Generate URLs from Mux
    const videoUrl = muxService.getPlaybackUrl(asset.playbackId);
    const thumbnailUrl = muxService.getThumbnailUrl(asset.playbackId, { width: 720 });

    // Create video record
    const video = await prisma.video.create({
      data: {
        userId: req.user.id,
        videoUrl,
        thumbnailUrl,
        duration: Math.round(asset.duration || 0),
        aspectRatio: asset.aspectRatio || '9:16',
        caption,
        hashtags: allHashtags,
        mentions: mentionIds,
        visibility: visibility || 'PUBLIC',
        allowDuet: allowDuet !== false,
        allowStitch: allowStitch !== false,
        allowComments: allowComments !== false,
        soundId: soundId || null,
        category: category || 'OTHER',
        processingStatus: 'COMPLETED',
        categoryScores: { muxAssetId: asset.id, muxPlaybackId: asset.playbackId }
      },
      include: {
        user: {
          select: { id: true, name: true, displayName: true, avatarUrl: true }
        }
      }
    });

    // Update hashtag counts
    for (const tag of allHashtags) {
      await prisma.hashtag.upsert({
        where: { name: tag },
        create: { name: tag, postCount: 1 },
        update: { postCount: { increment: 1 } }
      });
    }

    // Create notifications for mentioned users
    for (const userId of mentionIds) {
      if (userId !== req.user.id) {
        await prisma.notification.create({
          data: {
            userId,
            actorId: req.user.id,
            type: 'VIDEO_MENTION',
            title: 'You were tagged',
            body: 'tagged you in a video',
            data: { videoId: video.id }
          }
        });
      }
    }

    // Create activity
    await prisma.activity.create({
      data: {
        userId: req.user.id,
        type: 'CREATE_VIDEO',
        details: JSON.stringify({ videoId: video.id })
      }
    });

    res.status(201).json(video);
  } catch (error) {
    console.error('Error creating video from Mux upload:', error);
    res.status(500).json({ message: 'Failed to create video' });
  }
});

// Check Mux upload status
router.get('/mux/upload-status/:uploadId', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { uploadId } = req.params;
    const uploadIdStr = Array.isArray(uploadId) ? uploadId[0] : uploadId;
    const status = await muxService.getUploadStatus(uploadIdStr);
    res.json(status);
  } catch (error) {
    console.error('Error checking upload status:', error);
    res.status(500).json({ message: 'Failed to check upload status' });
  }
});

// Mux webhook handler
router.post('/mux/webhook', async (req: Request, res: Response): Promise<void> => {
  try {
    // Mux sends webhooks for various events
    // We can use these to update video processing status
    const { type, data } = req.body;

    console.log('Mux webhook received:', type);

    switch (type) {
      case 'video.asset.ready':
        // Video is ready for playback
        // You could update the video status here if tracking by muxAssetId
        console.log('Video asset ready:', data.id);
        break;

      case 'video.asset.errored':
        // Video processing failed
        console.error('Video asset errored:', data.id, data.errors);
        break;

      case 'video.upload.asset_created':
        // Upload completed, asset created
        console.log('Upload asset created:', data.asset_id);
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling Mux webhook:', error);
    res.status(500).json({ message: 'Webhook handling failed' });
  }
});

// Create video from external URL (YouTube, Vimeo, etc.)
router.post('/embed', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { url, caption, hashtags, mentions, visibility, category } = req.body;

    if (!url) {
      res.status(400).json({ message: 'Video URL is required' });
      return;
    }

    // Validate URL is from supported platforms
    const supportedPlatforms = ['youtube.com', 'youtu.be', 'vimeo.com'];
    const urlObj = new URL(url);
    const isSupported = supportedPlatforms.some(platform => urlObj.hostname.includes(platform));

    if (!isSupported) {
      res.status(400).json({ message: 'Unsupported video platform. Currently supports YouTube and Vimeo.' });
      return;
    }

    // Extract hashtags from caption
    const hashtagRegex = /#(\w+)/g;
    const extractedHashtags = caption
      ? [...caption.matchAll(hashtagRegex)].map((match: RegExpMatchArray) => match[1].toLowerCase())
      : [];
    const allHashtags = [...new Set([...extractedHashtags, ...(hashtags || [])])];

    // Extract mentions from caption
    const mentionRegex = /@(\w+)/g;
    const mentionedNames = caption
      ? [...caption.matchAll(mentionRegex)].map((match: RegExpMatchArray) => match[1])
      : [];

    // Find mentioned users
    const mentionedUsers = mentionedNames.length > 0 ? await prisma.user.findMany({
      where: {
        OR: [
          { name: { in: mentionedNames, mode: 'insensitive' } },
          { displayName: { in: mentionedNames, mode: 'insensitive' } }
        ]
      },
      select: { id: true }
    }) : [];

    const mentionIds = [...new Set([...mentionedUsers.map(u => u.id), ...(mentions || [])])];

    // Create video record for external URL
    const video = await prisma.video.create({
      data: {
        userId: req.user.id,
        videoUrl: url,
        duration: 0, // External videos don't have duration in our schema
        caption,
        hashtags: allHashtags,
        mentions: mentionIds,
        visibility: visibility || 'PUBLIC',
        allowDuet: false, // External videos don't support duet/stitch
        allowStitch: false,
        allowComments: true,
        soundId: null,
        category: category || 'OTHER',
        processingStatus: 'COMPLETED'
      },
      include: {
        user: {
          select: { id: true, name: true, displayName: true, avatarUrl: true }
        }
      }
    });

    // Update hashtag counts
    for (const tag of allHashtags) {
      await prisma.hashtag.upsert({
        where: { name: tag },
        create: { name: tag, postCount: 1 },
        update: { postCount: { increment: 1 } }
      });
    }

    // Create notifications for mentioned users
    for (const userId of mentionIds) {
      if (userId !== req.user.id) {
        await prisma.notification.create({
          data: {
            userId,
            actorId: req.user.id,
            type: 'VIDEO_MENTION',
            title: 'You were tagged',
            body: 'tagged you in a video',
            data: { videoId: video.id }
          }
        });
      }
    }

    // Create activity
    await prisma.activity.create({
      data: {
        userId: req.user.id,
        type: 'CREATE_VIDEO',
        details: JSON.stringify({ videoId: video.id })
      }
    });

    res.status(201).json(video);
  } catch (error) {
    console.error('Embed video error:', error);
    res.status(500).json({ message: 'Failed to embed video' });
  }
});

export default router;
