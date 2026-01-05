import prisma from '../db';

export const LEVELS = [
  { level: 1, xp: 0, title: "Novice Reader" },
  { level: 2, xp: 100, title: "Bookworm" },
  { level: 3, xp: 300, title: "Page Turner" },
  { level: 4, xp: 600, title: "Chapter Champion" },
  { level: 5, xp: 1000, title: "Literary Scholar" },
  { level: 6, xp: 1500, title: "Grand Archivist" },
  { level: 7, xp: 2200, title: "Cyber-Librarian" },
  { level: 8, xp: 3000, title: "Info-Broker" },
  { level: 9, xp: 4000, title: "Knowledge Keeper" },
  { level: 10, xp: 5500, title: "Omniscient Reader" },
];

export async function awardPoints(userId: string, points: number, reason: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const newPoints = user.points + points;
  
  // Calculate new level
  let newLevel = user.level;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (newPoints >= LEVELS[i].xp) {
      newLevel = LEVELS[i].level;
      break;
    }
  }

  // Update user
  await prisma.user.update({
    where: { id: userId },
    data: { 
      points: newPoints, 
      level: newLevel 
    }
  });

  // Log activity
  await prisma.activity.create({
    data: {
      userId,
      type: 'EARN_POINTS',
      details: `${points} XP: ${reason}`
    }
  });

  // Check for level up activity
  if (newLevel > user.level) {
    await prisma.activity.create({
      data: {
        userId,
        type: 'LEVEL_UP',
        details: `Reached Level ${newLevel}: ${LEVELS.find(l => l.level === newLevel)?.title}`
      }
    });
  }

  return { newPoints, newLevel };
}

export async function awardBadge(userId: string, badgeName: string) {
  const badge = await prisma.badge.findUnique({ where: { name: badgeName } });
  if (!badge) return;

  // Check if user already has badge
  const existing = await prisma.user.findFirst({
    where: {
      id: userId,
      badges: {
        some: {
          id: badge.id
        }
      }
    }
  });

  if (existing) return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      badges: {
        connect: { id: badge.id }
      }
    }
  });

  await prisma.activity.create({
    data: {
      userId,
      type: 'EARN_BADGE',
      details: `Unlocked Badge: ${badge.name}`
    }
  });
}
