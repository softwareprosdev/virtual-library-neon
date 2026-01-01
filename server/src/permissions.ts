import prisma from './db';

export enum Role {
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  LISTENER = 'LISTENER'
}

export const getRoomRole = async (userId: string, roomId: string): Promise<Role> => {
  // 1. Check if Host (Admin)
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { hostId: true }
  });

  if (room?.hostId === userId) return Role.ADMIN;

  // 2. Check if Moderator
  const moderator = await prisma.moderator.findUnique({
    where: { userId_roomId: { userId, roomId } }
  });

  if (moderator) return Role.MODERATOR;

  // 3. Default to Listener
  return Role.LISTENER;
};
