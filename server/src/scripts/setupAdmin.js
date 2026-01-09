const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const ELITE_BADGES = [
  {
    name: 'Elite Admin',
    description: 'Supreme administrator with unlimited powers',
    iconUrl: '👑'
  },
  {
    name: 'Legendary Reader',
    description: 'Read over 1000 books',
    iconUrl: '📚'
  },
  {
    name: 'Master Curator',
    description: 'Created exceptional book collections',
    iconUrl: '✨'
  },
  {
    name: 'Community Leader',
    description: 'Led and inspired the community',
    iconUrl: '🌟'
  },
  {
    name: 'Beta Tester',
    description: 'Early supporter and tester',
    iconUrl: '🔬'
  },
  {
    name: 'Platinum Supporter',
    description: 'Exceptional platform contribution',
    iconUrl: '💎'
  },
  {
    name: 'Knowledge Master',
    description: 'Master of literary knowledge',
    iconUrl: '🧠'
  },
  {
    name: 'Discussion Champion',
    description: 'Led over 500 book discussions',
    iconUrl: '🎤'
  },
  {
    name: 'First Founder',
    description: 'One of the original platform founders',
    iconUrl: '🏆'
  },
  {
    name: 'Literary Legend',
    description: 'Legendary status in the community',
    iconUrl: '📖'
  }
];

async function ensureBadgesExist() {
  console.log('🎖️  Ensuring all badges exist...');
  const badges = [];
  for (const badgeData of ELITE_BADGES) {
    let badge = await prisma.badge.findUnique({
      where: { name: badgeData.name }
    });

    if (!badge) {
      badge = await prisma.badge.create({
        data: badgeData
      });
      console.log(`  ✓ Created badge: ${badgeData.iconUrl} ${badgeData.name}`);
    }
    badges.push(badge);
  }
  return badges;
}

async function awardBadgesToUser(userId, badgeCount) {
  const badges = await ensureBadgesExist();
  const badgesToAward = badges.slice(0, badgeCount);
  
  for (const badge of badgesToAward) {
    try {
      await prisma.badge.update({
        where: { id: badge.id },
        data: {
          users: {
            connect: { id: userId }
          }
        }
      });
    } catch (e) {
      // Badge already connected, ignore
    }
  }
  return badgesToAward.length;
}

async function setupEliteAdmin() {
  try {
    console.log('🚀 Setting up Elite Admin account for GyattDamnn...\n');

    // Find user by email or name
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { contains: 'GyattDamnn', mode: 'insensitive' } },
          { name: { contains: 'GyattDamnn', mode: 'insensitive' } },
          { displayName: { contains: 'GyattDamnn', mode: 'insensitive' } }
        ]
      }
    });

    if (!user) {
      console.log('❌ User "GyattDamnn" not found.');
      console.log('Listing all users:');
      const allUsers = await prisma.user.findMany({ select: { id: true, name: true, email: true } });
      allUsers.forEach(u => console.log(`  - ${u.name} (${u.email})`));
      return;
    }

    console.log(`✅ Found user: ${user.name} (${user.email})\n`);

    // Update user to ELITE_ADMIN with maximum points and level
    await prisma.user.update({
      where: { id: user.id },
      data: {
        role: 'ELITE_ADMIN',
        points: 999999,
        level: 100,
        displayName: 'GyattDamnn 👑',
        bio: 'Elite Administrator & Founder of IndexBin. Building the future of digital libraries.',
        statusMessage: '📚 Always reading, always learning'
      }
    });

    console.log('👑 Promoted to ELITE_ADMIN');
    console.log('⭐ Set level to 100');
    console.log('💎 Set points to 999,999\n');

    // Award all badges
    const badgeCount = await awardBadgesToUser(user.id, ELITE_BADGES.length);
    console.log(`\n🎉 Successfully awarded ${badgeCount} badges!\n`);

    // Create activity log
    await prisma.activity.create({
      data: {
        userId: user.id,
        type: 'ACHIEVEMENT',
        details: 'Promoted to Elite Admin with all badges and maximum points'
      }
    });

    // Get final user state
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { badges: true }
    });

    console.log('═══════════════════════════════════════');
    console.log('  ELITE ADMIN SETUP COMPLETE');
    console.log('═══════════════════════════════════════');
    console.log(`Name: ${updatedUser?.name}`);
    console.log(`Email: ${updatedUser?.email}`);
    console.log(`Role: ${updatedUser?.role}`);
    console.log(`Level: ${updatedUser?.level}`);
    console.log(`Points: ${updatedUser?.points?.toLocaleString()}`);
    console.log(`Badges: ${updatedUser?.badges.length}`);
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error setting up elite admin:', error);
  }
}

async function setupModerator() {
  try {
    console.log('🚀 Setting up Moderator account for LaraK...\n');

    // Find user by email or name
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { contains: 'LaraK', mode: 'insensitive' } },
          { name: { contains: 'LaraK', mode: 'insensitive' } },
          { displayName: { contains: 'LaraK', mode: 'insensitive' } },
          { email: { contains: 'lara', mode: 'insensitive' } },
          { name: { contains: 'lara', mode: 'insensitive' } }
        ]
      }
    });

    if (!user) {
      console.log('❌ User "LaraK" not found.');
      console.log('Listing all users:');
      const allUsers = await prisma.user.findMany({ select: { id: true, name: true, email: true } });
      allUsers.forEach(u => console.log(`  - ${u.name} (${u.email})`));
      return;
    }

    console.log(`✅ Found user: ${user.name} (${user.email})\n`);

    // Update user to MODERATOR with good points and level
    await prisma.user.update({
      where: { id: user.id },
      data: {
        role: 'MODERATOR',
        points: 50000,
        level: 50,
        displayName: 'LaraK 🛡️',
        bio: 'Community Moderator helping keep IndexBin a great place for book lovers!',
        statusMessage: '🛡️ Keeping the community safe'
      }
    });

    console.log('🛡️ Promoted to MODERATOR');
    console.log('⭐ Set level to 50');
    console.log('💎 Set points to 50,000\n');

    // Award half the badges (5 out of 10)
    const badgeCount = await awardBadgesToUser(user.id, Math.floor(ELITE_BADGES.length / 2));
    console.log(`\n🎉 Successfully awarded ${badgeCount} badges!\n`);

    // Create activity log
    await prisma.activity.create({
      data: {
        userId: user.id,
        type: 'ACHIEVEMENT',
        details: 'Promoted to Moderator with badges and points'
      }
    });

    // Get final user state
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { badges: true }
    });

    console.log('═══════════════════════════════════════');
    console.log('  MODERATOR SETUP COMPLETE');
    console.log('═══════════════════════════════════════');
    console.log(`Name: ${updatedUser?.name}`);
    console.log(`Email: ${updatedUser?.email}`);
    console.log(`Role: ${updatedUser?.role}`);
    console.log(`Level: ${updatedUser?.level}`);
    console.log(`Points: ${updatedUser?.points?.toLocaleString()}`);
    console.log(`Badges: ${updatedUser?.badges.length}`);
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error setting up moderator:', error);
  }
}

async function setupAllRoles() {
  await setupEliteAdmin();
  await setupModerator();
  await prisma.$disconnect();
}

// Run if called directly
if (require.main === module) {
  setupAllRoles();
}

module.exports = { setupEliteAdmin, setupModerator };
module.exports.default = setupAllRoles;
