import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const sampleRooms = [
  {
    name: 'Book Lovers United',
    description: 'A cozy space for book enthusiasts to discuss their favorite reads and discover new ones.',
    genreName: 'Fiction',
  },
  {
    name: 'Sci-Fi Explorers',
    description: 'Journey through the stars and explore futuristic worlds in our science fiction community.',
    genreName: 'Science Fiction',
  },
  {
    name: 'Mystery & Thrillers',
    description: 'Dive into suspenseful tales and discuss plot twists with fellow mystery lovers.',
    genreName: 'Mystery',
  },
  {
    name: 'Romance Corner',
    description: 'Share stories of love, passion, and happily ever afters.',
    genreName: 'Romance',
  },
  {
    name: 'Non-Fiction Hub',
    description: 'Explore real-world knowledge, biographies, and educational content.',
    genreName: 'Biography',
  },
  {
    name: 'Poetry & Prose',
    description: 'Share and discuss beautiful words, verses, and creative writing.',
    genreName: 'Poetry',
  },
];

export async function seedRooms() {
  console.log('🎭 Seeding community rooms...');

  try {
    // Get or create genres
    const genres = await Promise.all(
      sampleRooms.map(async (room) => {
        let genre = await prisma.genre.findFirst({
          where: { name: room.genreName }
        });

        if (!genre) {
          genre = await prisma.genre.create({
            data: { name: room.genreName }
          });
        }

        return genre;
      })
    );

    // Get a demo user to be the host
    const demoUser = await prisma.user.findFirst({
      where: { email: { contains: '@demo.com' } }
    });

    if (!demoUser) {
      console.log('❌ No demo user found. Please run user seeding first.');
      return;
    }

    // Create rooms
    const createdRooms = [];
    for (let i = 0; i < sampleRooms.length; i++) {
      const roomData = sampleRooms[i];
      const genre = genres[i];

      const existingRoom = await prisma.room.findFirst({
        where: { name: roomData.name }
      });

      if (!existingRoom) {
        const room = await prisma.room.create({
          data: {
            name: roomData.name,
            description: roomData.description,
            genreId: genre.id,
            hostId: demoUser.id,
            isLive: true,
          },
          include: {
            host: { select: { name: true } },
            genre: true,
            _count: { select: { messages: true, participants: true } }
          }
        });

        createdRooms.push(room);
        console.log(`✅ Created room: ${room.name}`);
      } else {
        console.log(`⏭️  Room already exists: ${roomData.name}`);
      }
    }

    console.log(`🎭 Successfully seeded ${createdRooms.length} community rooms`);

    // Add some sample participants to make rooms look active
    for (const room of createdRooms) {
      // Add the host as a participant
      await prisma.participant.upsert({
        where: {
          userId_roomId: {
            userId: demoUser.id,
            roomId: room.id
          }
        },
        update: {},
        create: {
          userId: demoUser.id,
          roomId: room.id,
        }
      });
    }

    console.log('👥 Added participants to rooms');

  } catch (error) {
    console.error('❌ Error seeding rooms:', error);
  }
}

// Run if called directly
if (require.main === module) {
  seedRooms()
    .then(() => {
      console.log('🎭 Room seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Room seeding failed:', error);
      process.exit(1);
    });
}