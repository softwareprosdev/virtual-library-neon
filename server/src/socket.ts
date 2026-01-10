import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';

// Ambient declaration for notification service
declare const getNotificationService: any;
import { createClient } from 'redis';
import jwt from 'jsonwebtoken';
import prisma from './db';
import { getRoomRole, Role } from './permissions';
import { JWTPayload } from './middlewares/auth';
import { initializeNotifications, getNotificationService } from './services/notificationService';

interface AuthSocket extends Socket {
  user?: JWTPayload;
}

const isProduction = process.env.NODE_ENV === 'production';

export const setupSocket = async (io: Server) => {
  // Initialize notification service
  initializeNotifications(io);

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is required');
  }
  const isTls = redisUrl.startsWith('rediss://');

  const pubClient = createClient({ 
    url: redisUrl,
    socket: isTls ? {
      tls: true,
      rejectUnauthorized: false
    } : undefined
  });
  const subClient = pubClient.duplicate();

  // Add error handlers for Redis clients
  pubClient.on('error', (err) => {
    console.error('Redis pub client error:', err);
  });
  subClient.on('error', (err) => {
    console.error('Redis sub client error:', err);
  });

  await Promise.all([pubClient.connect(), subClient.connect()]);
  console.log('[redis]: Connected to Redis Adapter');
  io.adapter(createAdapter(pubClient, subClient));

  io.use((socket: AuthSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error: missing token"));

    jwt.verify(token, process.env.JWT_SECRET as string, (err: jwt.VerifyErrors | null, decoded: string | jwt.JwtPayload | undefined) => {
      if (err) return next(new Error("Authentication error: invalid token"));
      socket.user = decoded as JWTPayload;
      next();
    });
  });

  io.on('connection', (socket: AuthSocket) => {
    // Join user to their personal notification room
    if (socket.user?.id) {
      socket.join(`user:${socket.user.id}`);
    }

    socket.on('joinRoom', async ({ roomId }) => {
      if (!roomId || !socket.user) return;
      
      socket.join(roomId);

      try {
        // Phase 2: Register Participant in DB
        await prisma.participant.upsert({
          where: { userId_roomId: { userId: socket.user.id, roomId } },
          update: { joinedAt: new Date() },
          create: { userId: socket.user.id, roomId }
        });

        // Phase 8: Record Interaction for Personalization
        const roomData = await prisma.room.findUnique({ where: { id: roomId }, select: { genreId: true } });
        await prisma.interaction.create({
          data: {
            userId: socket.user.id,
            roomId,
            genreId: roomData?.genreId
          }
        });

        const role = await getRoomRole(socket.user.id, roomId);
        io.to(roomId).emit('userJoined', {
          userId: socket.user.id,
          email: socket.user.email,
          role
        });
      } catch (error) {
        if (!isProduction) console.error("Join Error:", error);
        socket.emit('error', { message: "Failed to join room" });
      }
    });

    socket.on('leaveRoom', async ({ roomId }) => {
      if (!roomId || !socket.user) return;

      socket.leave(roomId);

      try {
        await prisma.participant.deleteMany({
          where: { userId: socket.user.id, roomId }
        });
        io.to(roomId).emit('userLeft', { userId: socket.user.id });
      } catch (error) {
        // Ignore if already deleted, but log in development
        if (!isProduction) console.error("Leave room cleanup error:", error);
      }
    });

    socket.on('chat', async ({ roomId, text }) => {
      if (!roomId || !text || !socket.user) return;

      // Phase 6 Preview: Basic Toxicity Filter
      const toxicityKeywords = ['harass', 'abuse', 'hate']; 
      const isToxic = toxicityKeywords.some(word => text.toLowerCase().includes(word));

      try {
        const message = await prisma.message.create({
          data: { 
            text: isToxic ? '[MESSAGE_REDACTED_BY_AI_SAFETY]' : text, 
            roomId, 
            senderId: socket.user.id 
          },
          include: { sender: { select: { id: true, name: true, email: true } } }
        });
        io.to(roomId).emit('message', { ...message, isFlagged: isToxic });
      } catch (error) {
        socket.emit('error', { message: "Failed to send message" });
      }
    });

    socket.on('deleteMessage', async ({ roomId, messageId }) => {
      if (!socket.user) return;
      const role = await getRoomRole(socket.user.id, roomId);

      if (role === Role.ADMIN || role === Role.MODERATOR) {
        try {
          await prisma.message.delete({ where: { id: messageId } });
          io.to(roomId).emit('messageDeleted', { messageId });
        } catch (error) {
          if (!isProduction) console.error("Delete Error:", error);
          socket.emit('error', { message: "Failed to delete message" });
        }
      }
    });

    socket.on('signal', ({ targetId, signal }) => {
      io.to(targetId).emit('signal', {
        from: socket.id,
        signal,
        userId: socket.user?.id
      });
    });

    // Direct message handling
    socket.on('directMessage', async ({ receiverId, text }) => {
      if (!receiverId || !text || !socket.user?.id) return;

      try {
        const message = await prisma.message.create({
          data: { 
            text, 
            senderId: socket.user.id, 
            receiverId,
            roomId: null
          },
          include: { 
            sender: { select: { id: true, name: true, email: true, displayName: true, avatarUrl: true } },
            receiver: { select: { id: true, name: true, displayName: true, avatarUrl: true } }
          }
        });

        // Send to both sender and receiver
        const messageData = { ...message, isFlagged: false };
        io.to(`user:${receiverId}`).emit('directMessage', messageData);
        io.to(`user:${socket.user.id}`).emit('directMessage', messageData);

        // Send notification
        try {
          const notificationService = getNotificationService();
          notificationService.sendDirectMessageNotification(
            socket.user.id,
            message.sender.displayName || message.sender.name,
            receiverId,
            text
          );
        } catch (error) {
          console.error('Failed to send message notification:', error);
        }
      } catch (error) {
        socket.emit('error', { message: "Failed to send direct message" });
      }
    });

    socket.on('markMessagesRead', async ({ senderId }) => {
      if (!socket.user?.id) return;

      try {
        await prisma.message.updateMany({
          where: {
            senderId,
            receiverId: socket.user.id,
            readAt: null
          },
          data: {
            readAt: new Date()
          }
        });

        io.to(`user:${senderId}`).emit('messagesRead', {
          readerId: socket.user.id
        });
      } catch (error) {
        socket.emit('error', { message: "Failed to mark messages as read" });
      }
    });

    socket.on('markNotificationsRead', async () => {
      if (!socket.user?.id) return;
      
      try {
        // Mark notifications as read (would implement notification model)
        io.to(`user:${socket.user.id}`).emit('notificationsRead');
      } catch (error) {
        console.error('Error marking notifications read:', error);
      }
    });

    socket.on('disconnect', async () => {
      // Cleanup: Remove user from all participants entries
      if (socket.user) {
        try {
          await prisma.participant.deleteMany({ where: { userId: socket.user.id } });
        } catch (error) {
          if (!isProduction) console.error("Disconnect cleanup error:", error);
        }
      }
    });
  });
};
