import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import jwt from 'jsonwebtoken';
import prisma from './db';

interface AuthSocket extends Socket {
  user?: { id: string; email: string };
}

export const setupSocket = async (io: Server) => {
  // Redis Adapter Setup for Scalability
  const pubClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  const subClient = pubClient.duplicate();

  await Promise.all([pubClient.connect(), subClient.connect()]);
  console.log('🚀[redis]: Connected to Redis Adapter');
  io.adapter(createAdapter(pubClient, subClient));

  // Middleware for authentication
  io.use((socket: AuthSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    jwt.verify(token, process.env.JWT_SECRET as string, (err: any, decoded: any) => {
      if (err) {
        return next(new Error("Authentication error: Invalid token"));
      }
      socket.user = decoded;
      next();
    });
  });

  io.on('connection', (socket: AuthSocket) => {
    socket.on('joinRoom', async ({ roomId }) => {
      if (!roomId) return;
      socket.join(roomId);
      io.to(roomId).emit('userJoined', { userId: socket.user?.id, email: socket.user?.email });
    });

    socket.on('leaveRoom', ({ roomId }) => {
      if (!roomId) return;
      socket.leave(roomId);
      io.to(roomId).emit('userLeft', { userId: socket.user?.id });
    });

    socket.on('chat', async ({ roomId, text }) => {
      if (!roomId || !text) return;

      try {
        const message = await prisma.message.create({
          data: { text, roomId, senderId: socket.user!.id },
          include: { sender: { select: { id: true, name: true, email: true } } }
        });
        io.to(roomId).emit('message', message);
      } catch (error) {
        console.error("Error saving message:", error);
        socket.emit('error', { message: "Failed to send message" });
      }
    });

    // WebRTC Signaling
    socket.on('signal', ({ roomId, targetId, signal }) => {
      io.to(targetId).emit('signal', {
        from: socket.id,
        signal,
        userId: socket.user?.id
      });
    });

    socket.on('disconnect', () => {
      console.log('User Disconnected', socket.id);
    });
  });
};