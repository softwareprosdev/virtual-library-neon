import prisma from '../src/db';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🚀 Starting Phase 1 system initialization...');

  // 1. System User
  const hashedPassword = await bcrypt.hash('system_pass_123', 10);
  const systemUser = await prisma.user.upsert({
    where: { email: 'system@v-library.com' },
    update: {},
    create: {
      email: 'system@v-library.com',
      password: hashedPassword,
      name: 'V-Library System',
      ageVerified: true
    }
  });

  // 2. Genres (Phase 1 Task)
  const genresData = [
    { name: 'Erotica', isAdult: true, description: 'Explicit adult literature and erotic themes.' },
    { name: 'Dark Romance', isAdult: true, description: 'Intense romantic themes with mature content.' },
    { name: 'Cyberpunk Noir', isAdult: true, description: 'Grit, tech, and adult themes in futuristic settings.' },
    { name: 'Graphic Horror', isAdult: true, description: 'Visceral horror and supernatural adult themes.' },
    { name: 'Classic Sci-Fi', isAdult: false, description: 'Traditional science fiction exploration.' },
    { name: 'Tech & Engineering', isAdult: false, description: 'Coding, hardware, and engineering deep dives.' },
  ];

  console.log('🌱 Seeding genres and initial rooms...');

  for (const genreItem of genresData) {
    const genre = await prisma.genre.upsert({
      where: { name: genreItem.name },
      update: { isAdult: genreItem.isAdult, description: genreItem.description },
      create: genreItem,
    });

    // 3. Create a default "Live Now" room for each genre (Phase 2 Task preview)
    await prisma.room.create({
      data: {
        name: `${genre.name} Live Hub`,
        description: `Official hub for ${genre.name} enthusiasts.`,
        hostId: systemUser.id,
        genreId: genre.id,
        isLive: true
      }
    });
  }

  console.log('✨ Foundation seeded. Ready for discovery!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });