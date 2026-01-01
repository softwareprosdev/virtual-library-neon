import prisma from '../src/db';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🚀 Starting system initialization...');

  // 1. Create a System/Admin user to host the default rooms
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

  console.log('✅ System user ready.');

  // 2. Define Categories
  const categoriesData = [
    { name: 'Erotica & Dark Romance', description: 'Explicit adult literature and intense romantic themes.' },
    { name: 'Mature Sci-Fi & Cyberpunk', description: 'Grit, noir, and adult themes in futuristic settings.' },
    { name: 'Horror & Taboo', description: 'Graphic horror and controversial literary explorations.' },
    { name: 'Philosophy & Counter-Culture', description: 'Deep intellectual dives into radical and mature concepts.' },
    { name: 'Technical Docs', description: 'Deep dives into code, architecture, and engineering.' },
  ];

  console.log('🌱 Seeding categories and rooms...');

  for (const cat of categoriesData) {
    const category = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });

    // 3. Create a default room for each category
    await prisma.room.create({
      data: {
        name: `${cat.name} Lounge`,
        description: `Official discussion hub for ${cat.name}. All mature readers welcome.`,
        hostId: systemUser.id,
        categoryId: category.id
      }
    });
  }

  console.log('✨ Initialization complete. Dashboard populated!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
