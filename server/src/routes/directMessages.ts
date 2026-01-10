import express from 'express';
import { authenticateToken } from '../middlewares/auth';
import { getNotificationService } from '../services/notificationService';
import prisma from '../db';

const router = express.Router();

// Get conversation list
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    // Get users that the current user has had conversations with
    const conversations = await prisma.$queryRaw`
      WITH conversation_partners AS (
        SELECT DISTINCT
          CASE 
            WHEN "senderId" = ${userId} THEN "receiverId"
            ELSE "senderId"
          END as "partnerId",
          MAX("createdAt") as "lastMessageAt"
        FROM "Message"
        WHERE ("senderId" = ${userId} OR "receiverId" = ${userId})
          AND "roomId" IS NULL
        GROUP BY CASE 
          WHEN "senderId" = ${userId} THEN "receiverId"
          ELSE "senderId"
        END
      )
      SELECT 
        cp."partnerId",
        u.name,
        u."displayName",
        u."avatarUrl",
        cp."lastMessageAt",
        (
          SELECT COUNT(*) 
          FROM "Message" 
          WHERE "senderId" = cp."partnerId" 
            AND "receiverId" = ${userId}
            AND "readAt" IS NULL
        ) as "unreadCount"
      FROM conversation_partners cp
      JOIN "User" u ON u.id = cp."partnerId"
      ORDER BY cp."lastMessageAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    res.status(200).json(conversations);
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

// Get messages with a specific user
router.get('/conversation/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId: partnerId } = req.params;
    const currentUserId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // Get messages between the two users
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: partnerId },
          { senderId: partnerId, receiverId: currentUserId }
        ],
        roomId: null
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
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });

    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        senderId: partnerId,
        receiverId: currentUserId,
        readAt: null
      },
      data: {
        readAt: new Date()
      }
    });

    res.status(200).json(messages.reverse());
  } catch (error) {
    console.error('Error getting conversation:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

// Send direct message
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { receiverId, text } = req.body;
    const senderId = req.user!.userId;

    if (!receiverId || !text?.trim()) {
      return res.status(400).json({ error: 'Receiver ID and message text are required' });
    }

    if (senderId === receiverId) {
      return res.status(400).json({ error: 'Cannot send message to yourself' });
    }

    // Check if receiver exists
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId }
    });

    if (!receiver) {
      return res.status(404).json({ error: 'Receiver not found' });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        text: text.trim(),
        senderId,
        receiverId,
        roomId: null
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

    // Send real-time notification
    try {
      const notificationService = getNotificationService();
      notificationService.sendDirectMessageNotification(
        senderId,
        message.sender.displayName || message.sender.name,
        receiverId,
        text.trim()
      );
    } catch (error) {
      console.error('Failed to send message notification:', error);
    }

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark messages as read
router.put('/read/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId: senderId } = req.params;
    const currentUserId = req.user!.userId;

    await prisma.message.updateMany({
      where: {
        senderId,
        receiverId: currentUserId,
        readAt: null
      },
      data: {
        readAt: new Date()
      }
    });

    res.status(200).json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// Delete message
router.delete('/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.user!.userId;

    const message = await prisma.message.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only sender can delete their own messages
    if (message.senderId !== currentUserId) {
      return res.status(403).json({ error: 'Not authorized to delete this message' });
    }

    await prisma.message.delete({
      where: { id: messageId }
    });

    res.status(200).json({ message: 'Message deleted' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Get unread message count
router.get('/unread/count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;

    const unreadCount = await prisma.message.count({
      where: {
        receiverId: userId,
        readAt: null
      }
    });

    res.status(200).json({ unreadCount });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

export default router;