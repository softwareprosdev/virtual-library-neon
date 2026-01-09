import prisma from '../db';

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

async function setupEliteAdmin() {
  try {
    console.log('🚀 Setting up Elite Admin account for GyattDamnn...\n');

    // Find user by email or name
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { contains: 'GyattDamnn', mode: 'insensitive' } },
          { name: { contains: 'GyattDamnn', mode: 'insensitive' } }
        ]
      }
    });

    if (!user) {
      console.log('❌ User "GyattDamnn" not found.');
      console.log('Please provide the email address of the user to promote:');
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
        displayName: 'GyattDamnn 👑 Elite Admin'
      }
    });

    console.log('👑 Promoted to ELITE_ADMIN');
    console.log('⭐ Set level to 100');
    console.log('💎 Set points to 999,999\n');

    // Create all elite badges
    console.log('🎖️  Creating elite badges...');
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

      // Award badge to user
      await prisma.badge.update({
        where: { id: badge.id },
        data: {
          users: {
            connect: { id: user.id }
          }
        }
      });
    }

    console.log(`\n🎉 Successfully awarded ${ELITE_BADGES.length} badges!\n`);

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
      include: {
        badges: true
      }
    });

    console.log('═══════════════════════════════════════');
    console.log('  ELITE ADMIN SETUP COMPLETE');
    console.log('═══════════════════════════════════════');
    console.log(`Name: ${updatedUser?.name}`);
    console.log(`Email: ${updatedUser?.email}`);
    console.log(`Role: ${updatedUser?.role}`);
    console.log(`Level: ${updatedUser?.level}`);
    console.log(`Points: ${updatedUser?.points.toLocaleString()}`);
    console.log(`Badges: ${updatedUser?.badges.length}`);
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error setting up elite admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  setupEliteAdmin();
}

export default setupEliteAdmin;
