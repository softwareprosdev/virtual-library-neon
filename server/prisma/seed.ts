import prisma from '../src/db';

async function main() {
  console.log('Seeding categories...');
  
  const categories = [
    { name: 'Erotica & Dark Romance', description: 'Explicit adult literature and intense romantic themes.' },
    { name: 'Mature Sci-Fi & Cyberpunk', description: 'Grit, noir, and adult themes in futuristic settings.' },
    { name: 'Horror & Taboo', description: 'Graphic horror and controversial literary explorations.' },
    { name: 'Philosophy & Counter-Culture', description: 'Deep intellectual dives into radical and mature concepts.' },
    { name: 'Technical Docs', description: 'Deep dives into code, architecture, and engineering.' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }

  console.log('Categories seeded!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });