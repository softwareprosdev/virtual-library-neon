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

    // Don't send sensitive info
    const { password, emailVerificationToken, emailVerificationExpires, ...publicProfile } = user;
    
    res.json(publicProfile);
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
      interests, statusMessage, profileLayout, isProfilePublic 
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
        isProfilePublic
      }
    });

    const { password, ...publicProfile } = updatedUser;
    res.json(publicProfile);
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

export default router;
