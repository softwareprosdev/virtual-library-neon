import prisma from '../src/db';

async function main() {
  console.log('Seeding categories...');
  
  const categories = [
    { name: 'Science Fiction', description: 'Discussing the future, space, and technology.' },
    { name: 'Technical Docs', description: 'Deep dives into code, architecture, and engineering.' },
    { name: 'Classical Literature', description: 'Analysis of timeless literary works.' },
    { name: 'History & Research', description: 'Archival discussions and historical research.' },
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