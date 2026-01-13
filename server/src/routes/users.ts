import { Router, Request, Response } from 'express';
import prisma from '../db';
import { AuthRequest, authenticateToken } from '../middlewares/auth';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const multer = require('multer');
import path from 'path';
import { S3Client } from '@aws-sdk/client-s3';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const multerS3 = require('multer-s3');



// Extend AuthRequest to include file from multer
interface AuthRequestWithFile extends AuthRequest {
  file?: Express.Multer.File;
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
    key: function (req: Request, file: Express.Multer.File, cb: (error: Error | null, key?: string) => void) {
      cb(null, `avatars/${Date.now()}-${file.originalname}`);
    }
  });
  console.log(' S3 Storage Enabled for Avatars');
} else {
  storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
      cb(null, `avatar-${Date.now()}-${file.originalname}`);
    }
  });
}

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for avatars
  fileFilter: (req: Request, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error("Only images are allowed"), false);
  }
});

// Get User Profile by Username (@username)
router.get('/@:username', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username } = req.params;

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        _count: {
          select: {
            profileComments: true,
            receivedProfileVisits: true,
            following: true,
            followedBy: true
          }
        },
        badges: true
      }
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Fetch top friends details
    let topFriendsDetails: any[] = [];
    if (user.topFriends && user.topFriends.length > 0) {
      const friends = await prisma.user.findMany({
        where: { id: { in: user.topFriends } },
        select: {
          id: true,
          name: true,
          displayName: true,
          avatarUrl: true,
          username: true,
          isVerified: true
        }
      });
      topFriendsDetails = user.topFriends
        .map(friendId => friends.find(f => f.id === friendId))
        .filter(Boolean);
    }

    // Don't send sensitive info
    const { password, emailVerificationToken, emailVerificationExpires, emailVerificationCode, ...publicProfile } = user;
    
    res.json({
      ...publicProfile,
      topFriends: topFriendsDetails
    });
  } catch (error) {
    console.error("Get Profile by Username Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get User Profile
router.get('/:id/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            profileComments: true,
            receivedProfileVisits: true
          }
        },
        badges: true
      }
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Fetch top friends details manually since it's an array of IDs, not a relation
    let topFriendsDetails: any[] = [];
    if (user.topFriends && user.topFriends.length > 0) {
      const friends = await prisma.user.findMany({
        where: { id: { in: user.topFriends } },
        select: {
          id: true,
          name: true,
          displayName: true,
          avatarUrl: true
        }
      });
      
      // Map back to preserve order from the ID array
      topFriendsDetails = user.topFriends
        .map(friendId => friends.find(f => f.id === friendId))
        .filter(Boolean);
    }

    // Don't send sensitive info
    const { password, emailVerificationToken, emailVerificationExpires, ...publicProfile } = user;
    
    // Attach detailed top friends
    res.json({
      ...publicProfile,
      topFriends: topFriendsDetails
    });
  } catch (error) {
    console.error("Get Profile Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Upload Avatar
router.post('/:id/avatar', authenticateToken, upload.single('avatar'), async (req: AuthRequestWithFile, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!req.user || req.user.id !== id) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fileLocation = (req.file as any).location;
    const fileUrl = fileLocation || `/uploads/${req.file.filename}`;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { avatarUrl: fileUrl }
    });

    res.json({ avatarUrl: updatedUser.avatarUrl });
  } catch (error) {
    console.error("Avatar Upload Error:", error);
    res.status(500).json({ message: "Upload failed" });
  }
});

// Update User Profile
router.put('/:id/profile', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!req.user || req.user.id !== id) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }

    const { 
      displayName, bio, location, website, socialLinks, 
      interests, statusMessage, profileLayout, isProfilePublic,
      profileSong, profileSongTitle, profileBackground
    } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        displayName,
        bio,
        location,
        website,
        socialLinks,
        interests,
        statusMessage,
        profileLayout,
        isProfilePublic,
        profileSong,
        profileSongTitle,
        profileBackground
      }
    });

    // Re-fetch top friends for consistency in response structure
    let topFriendsDetails: any[] = [];
    if (updatedUser.topFriends && updatedUser.topFriends.length > 0) {
      const friends = await prisma.user.findMany({
        where: { id: { in: updatedUser.topFriends } },
        select: {
          id: true,
          name: true,
          displayName: true,
          avatarUrl: true
        }
      });
      topFriendsDetails = updatedUser.topFriends
        .map(friendId => friends.find(f => f.id === friendId))
        .filter(Boolean);
    }

    const { password, ...publicProfile } = updatedUser;
    res.json({
      ...publicProfile,
      topFriends: topFriendsDetails
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update Profile Theme
router.put('/:id/theme', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!req.user || req.user.id !== id) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }

    const { theme } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        profileTheme: theme
      }
    });

    res.json({ message: "Theme updated", theme: updatedUser.profileTheme });
  } catch (error) {
    console.error("Update Theme Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Record Profile Visit
router.post('/:id/visit', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: profileId } = req.params;
    const visitorId = req.user?.id;

    if (!visitorId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (visitorId === profileId) {
      res.json({ message: "Self visit not recorded" });
      return;
    }

    // Use a transaction to create visit and increment view count
    await prisma.$transaction([
      prisma.profileVisit.create({
        data: {
          profileId,
          visitorId
        }
      }),
      prisma.user.update({
        where: { id: profileId },
        data: {
          profileViews: { increment: 1 }
        }
      })
    ]);

    res.json({ message: "Visit recorded" });
  } catch (error) {
    console.error("Record Visit Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get Profile Comments (The Wall)
router.get('/:id/comments', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const comments = await prisma.profileComment.findMany({
      where: { userId: id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const total = await prisma.profileComment.count({ where: { userId: id } });

    res.json({
      comments,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Get Comments Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Post Profile Comment
router.post('/:id/comments', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: profileId } = req.params;
    const authorId = req.user?.id;
    const { content } = req.body;

    if (!authorId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (!content || !content.trim()) {
      res.status(400).json({ message: "Comment cannot be empty" });
      return;
    }

    const comment = await prisma.profileComment.create({
      data: {
        userId: profileId,
        authorId,
        content: content.trim()
      },
      include: {
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

    res.json(comment);
  } catch (error) {
    console.error("Post Comment Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update Top Friends
router.put('/:id/top-friends', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { friendIds } = req.body;

    if (!userId || userId !== id) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }

    if (!Array.isArray(friendIds)) {
      res.status(400).json({ message: "Invalid format" });
      return;
    }

    // Limit to top 8 (Myspace classic)
    const limitedIds = friendIds.slice(0, 8);

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        topFriends: limitedIds
      }
    });

    // Fetch details to return
    const friends = await prisma.user.findMany({
      where: { id: { in: limitedIds } },
      select: {
        id: true,
        name: true,
        displayName: true,
        avatarUrl: true
      }
    });
    
    const topFriendsDetails = limitedIds
      .map(fid => friends.find(f => f.id === fid))
      .filter(Boolean);

    res.json({ topFriends: topFriendsDetails });
  } catch (error) {
    console.error("Update Top Friends Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update Username
router.put('/:id/username', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { username } = req.body;

    if (!userId || userId !== id) {
      res.status(403).json({ message: "Unauthorized" });
      return;
    }

    if (!username || !username.trim()) {
      res.status(400).json({ message: "Username is required" });
      return;
    }

    // Validate username format (alphanumeric and underscore only, 3-20 chars)
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      res.status(400).json({ 
        message: "Username must be 3-20 characters and contain only letters, numbers, and underscores" 
      });
      return;
    }

    // Check if username is already taken
    const existingUser = await prisma.user.findUnique({
      where: { username: username.toLowerCase() }
    });

    if (existingUser && existingUser.id !== id) {
      res.status(400).json({ message: "Username already taken" });
      return;
    }

    // Check cooldown period (30 days)
    const currentUser = await prisma.user.findUnique({
      where: { id },
      select: { usernameChangedAt: true }
    });

    if (currentUser?.usernameChangedAt) {
      const daysSinceChange = Math.floor(
        (Date.now() - new Date(currentUser.usernameChangedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceChange < 30) {
        res.status(400).json({ 
          message: `You can only change your username once every 30 days. Please wait ${30 - daysSinceChange} more days.` 
        });
        return;
      }
    }

    // Update username
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        username: username.toLowerCase(),
        usernameChangedAt: new Date()
      },
      select: {
        id: true,
        username: true,
        usernameChangedAt: true
      }
    });

    res.json({ 
      message: "Username updated successfully",
      username: updatedUser.username,
      nextChangeAvailable: new Date(updatedUser.usernameChangedAt!.getTime() + 30 * 24 * 60 * 60 * 1000)
    });
  } catch (error) {
    console.error("Update Username Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Check Username Availability
router.get('/username/check/:username', async (req: Request, res: Response): Promise<void> => {
  try {
    const username = String(req.params.username);

    // Validate format
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      res.json({ available: false, reason: "Invalid format" });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { username: username.toLowerCase() }
    });

    res.json({ available: !existingUser });
  } catch (error) {
    console.error("Check Username Error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;

