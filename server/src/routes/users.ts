import { Router, Request, Response } from 'express';
import prisma from '../db';
import { AuthRequest, authenticateToken } from '../middlewares/auth';

const router = Router();

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

export default router;
