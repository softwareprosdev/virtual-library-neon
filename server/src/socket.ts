import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import jwt from 'jsonwebtoken';
import prisma from './db';
import { getRoomRole, Role } from './permissions';

interface AuthSocket extends Socket {
  user?: { id: string; email: string };
}

export const setupSocket = async (io: Server) => {
  const pubClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6380' });
  const subClient = pubClient.duplicate();

  await Promise.all([pubClient.connect(), subClient.connect()]);
  console.log('🚀[redis]: Connected to Redis Adapter');
  io.adapter(createAdapter(pubClient, subClient));

  io.use((socket: AuthSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error"));

    jwt.verify(token, process.env.JWT_SECRET as string, (err: any, decoded: any) => {
      if (err) return next(new Error("Authentication error"));
      socket.user = decoded;
      next();
    });
  });

  io.on('connection', (socket: AuthSocket) => {
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
        console.error("Join Error:", error);
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
      } catch (e) { /* ignore if already deleted */ }
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
        } catch (e) {
          console.error("Delete Error:", e);
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

    socket.on('disconnect', async () => {
      // Cleanup: Remove user from all participants entries
      if (socket.user) {
        try {
          await prisma.participant.deleteMany({ where: { userId: socket.user.id } });
        } catch (e) {}
      }
    });
  });
};
