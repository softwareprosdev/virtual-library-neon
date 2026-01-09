import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middlewares/auth';
import { getNotificationService } from '../services/notificationService';

const router = express.Router();
const prisma = new PrismaClient();

// Send friend request
router.post('/request', authenticateToken, async (req, res) => {
  try {
    const { receiverId, message } = req.body;
    const senderId = req.user!.userId;

    if (senderId === receiverId) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    // Check if users exist
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId }
    });

    if (!receiver) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already friends
    const existingFollow = await prisma.follows.findUnique({
      where: {
        followerId_followingId: {
          followerId: senderId,
          followingId: receiverId
        }
      }
    });

    if (existingFollow) {
      return res.status(400).json({ error: 'Already friends with this user' });
    }

    // Check if request already exists
    const existingRequest = await prisma.friendRequest.findUnique({
      where: {
        senderId_receiverId: {
          senderId,
          receiverId
        }
      }
    });

    if (existingRequest) {
      return res.status(400).json({ error: 'Friend request already sent' });
    }

    // Create friend request
    const friendRequest = await prisma.friendRequest.create({
      data: {
        senderId,
        receiverId,
        message
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true
          }
        }
      }
    });

    // Create activity for sender
    await prisma.activity.create({
      data: {
        userId: senderId,
        type: 'SEND_FRIEND_REQUEST',
        details: `Sent friend request to ${receiver.displayName || receiver.name}`
      }
    });

    // Send real-time notification
    try {
      const notificationService = getNotificationService();
      notificationService.sendFriendRequestNotification(
        senderId,
        sender.displayName || sender.name,
        receiverId,
        message
      );
    } catch (error) {
      console.error('Failed to send friend request notification:', error);
    }

    res.status(201).json(friendRequest);
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// Get received friend requests
router.get('/requests/received', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;

    const requests = await prisma.friendRequest.findMany({
      where: {
        receiverId: userId,
        status: 'PENDING'
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(requests);
  } catch (error) {
    console.error('Error getting received requests:', error);
    res.status(500).json({ error: 'Failed to get friend requests' });
  }
});

// Get sent friend requests
router.get('/requests/sent', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;

    const requests = await prisma.friendRequest.findMany({
      where: {
        senderId: userId
      },
      include: {
        receiver: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(requests);
  } catch (error) {
    console.error('Error getting sent requests:', error);
    res.status(500).json({ error: 'Failed to get sent requests' });
  }
});

// Accept friend request
router.put('/requests/:requestId/accept', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const receiverId = req.user!.userId;

    // Find the friend request
    const friendRequest = await prisma.friendRequest.findUnique({
      where: { id: requestId }
    });

    if (!friendRequest) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    if (friendRequest.receiverId !== receiverId) {
      return res.status(403).json({ error: 'Not authorized to accept this request' });
    }

    if (friendRequest.status !== 'PENDING') {
      return res.status(400).json({ error: 'Friend request already processed' });
    }

    // Update request status
    const updatedRequest = await prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: 'ACCEPTED' },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true
          }
        }
      }
    });

    // Create follow relationships (mutual friendship)
    await Promise.all([
      prisma.follows.create({
        data: {
          followerId: receiverId,
          followingId: friendRequest.senderId
        }
      }),
      prisma.follows.create({
        data: {
          followerId: friendRequest.senderId,
          followingId: receiverId
        }
      })
    ]);

    // Create activities for both users
    await Promise.all([
      prisma.activity.create({
        data: {
          userId: receiverId,
          type: 'ACCEPT_FRIEND_REQUEST',
          details: `Accepted friend request from ${updatedRequest.sender.displayName || updatedRequest.sender.name}`
        }
      }),
      prisma.activity.create({
        data: {
          userId: friendRequest.senderId,
          type: 'FRIEND_REQUEST_ACCEPTED',
          details: `${updatedRequest.receiver.displayName || updatedRequest.receiver.name} accepted your friend request`
        }
      })
    ]);

    // Send real-time notification
    try {
      const notificationService = getNotificationService();
      notificationService.sendFriendRequestAcceptedNotification(
        receiverId,
        updatedRequest.receiver.displayName || updatedRequest.receiver.name,
        friendRequest.senderId
      );
    } catch (error) {
      console.error('Failed to send friend request accepted notification:', error);
    }

    res.status(200).json(updatedRequest);
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

// Decline friend request
router.put('/requests/:requestId/decline', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const receiverId = req.user!.userId;

    // Find the friend request
    const friendRequest = await prisma.friendRequest.findUnique({
      where: { id: requestId }
    });

    if (!friendRequest) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    if (friendRequest.receiverId !== receiverId) {
      return res.status(403).json({ error: 'Not authorized to decline this request' });
    }

    if (friendRequest.status !== 'PENDING') {
      return res.status(400).json({ error: 'Friend request already processed' });
    }

    // Update request status
    const updatedRequest = await prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: 'DECLINED' },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatarUrl: true
          }
        }
      }
    });

    // Create activity for receiver
    await prisma.activity.create({
      data: {
        userId: receiverId,
        type: 'DECLINE_FRIEND_REQUEST',
        details: `Declined friend request from ${updatedRequest.sender.displayName || updatedRequest.sender.name}`
      }
    });

    res.status(200).json(updatedRequest);
  } catch (error) {
    console.error('Error declining friend request:', error);
    res.status(500).json({ error: 'Failed to decline friend request' });
  }
});

// Get friendship status
router.get('/status/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user!.userId;

    if (currentUserId === userId) {
      return res.status(200).json({ status: 'self' });
    }

    // Check if already friends
    const friendship = await prisma.follows.findFirst({
      where: {
        OR: [
          { followerId: currentUserId, followingId: userId },
          { followerId: userId, followingId: currentUserId }
        ]
      }
    });

    if (friendship) {
      return res.status(200).json({ status: 'friends' });
    }

    // Check if there's a pending request
    const sentRequest = await prisma.friendRequest.findUnique({
      where: {
        senderId_receiverId: {
          senderId: currentUserId,
          receiverId: userId
        }
      }
    });

    if (sentRequest && sentRequest.status === 'PENDING') {
      return res.status(200).json({ status: 'request_sent' });
    }

    const receivedRequest = await prisma.friendRequest.findUnique({
      where: {
        senderId_receiverId: {
          senderId: userId,
          receiverId: currentUserId
        }
      }
    });

    if (receivedRequest && receivedRequest.status === 'PENDING') {
      return res.status(200).json({ status: 'request_received' });
    }

    res.status(200).json({ status: 'none' });
  } catch (error) {
    console.error('Error checking friendship status:', error);
    res.status(500).json({ error: 'Failed to check friendship status' });
  }
});

export default router;