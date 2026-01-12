import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 30+ diverse permanent community rooms
const permanentRooms = [
  // 📚 Book-Related Topics
  {
    name: 'Romance Readers Paradise',
    description: 'Discuss the steamiest romance novels, share recommendations, and swoon over book boyfriends.',
    genreName: 'Romance',
    category: 'Books'
  },
  {
    name: 'Sci-Fi & Fantasy Fanatics',
    description: 'Explore alternate worlds, magical systems, and futuristic concepts with fellow genre lovers.',
    genreName: 'Science Fiction',
    category: 'Books'
  },
  {
    name: 'Mystery & Thriller Sleuths',
    description: 'Unravel plot twists, discuss detective stories, and share your favorite whodunits.',
    genreName: 'Mystery',
    category: 'Books'
  },
  {
    name: 'BookTok Book Club',
    description: 'Join the viral book community! Share your latest reads and discover trending titles.',
    genreName: 'Fiction',
    category: 'Books'
  },
  {
    name: 'Poetry & Creative Writing',
    description: 'Share poems, discuss literary devices, and explore the art of creative expression.',
    genreName: 'Poetry',
    category: 'Books'
  },
  {
    name: 'Non-Fiction Wisdom Circle',
    description: 'Discuss biographies, self-help, history, and educational books that change perspectives.',
    genreName: 'Biography',
    category: 'Books'
  },

  // 💕 Relationships & Dating
  {
    name: 'Modern Dating Advice',
    description: 'Navigate dating apps, relationships, and modern romance with supportive discussions.',
    genreName: 'Romance',
    category: 'Relationships'
  },
  {
    name: 'Marriage & Long-Term Love',
    description: 'Share experiences about marriage, commitment, and building lasting relationships.',
    genreName: 'Romance',
    category: 'Relationships'
  },
  {
    name: 'Breakup Support Group',
    description: 'A safe space to heal, share stories, and find strength after relationship endings.',
    genreName: 'Fiction',
    category: 'Relationships'
  },
  {
    name: 'LGBTQ+ Love Stories',
    description: 'Celebrate diverse relationships, share coming out stories, and build community.',
    genreName: 'Romance',
    category: 'Relationships'
  },

  // 🌟 Trending Social Topics
  {
    name: 'Mental Health Matters',
    description: 'Discuss anxiety, depression, therapy experiences, and mental wellness journeys.',
    genreName: 'Biography',
    category: 'Wellness'
  },
  {
    name: 'Fitness & Healthy Living',
    description: 'Share workout routines, nutrition tips, and motivation for a healthier lifestyle.',
    genreName: 'Biography',
    category: 'Wellness'
  },
  {
    name: 'Parenting Adventures',
    description: 'Connect with other parents about raising kids, family life, and parenting challenges.',
    genreName: 'Biography',
    category: 'Family'
  },
  {
    name: 'Career & Professional Growth',
    description: 'Discuss job hunting, career changes, workplace advice, and professional development.',
    genreName: 'Biography',
    category: 'Career'
  },

  // 🎨 Hobbies & Interests
  {
    name: 'Art & Creativity Hub',
    description: 'Showcase artwork, discuss techniques, and inspire each other\'s creative journeys.',
    genreName: 'Fiction',
    category: 'Art'
  },
  {
    name: 'Music Lovers United',
    description: 'Discuss favorite artists, concerts, playlists, and the emotional power of music.',
    genreName: 'Fiction',
    category: 'Music'
  },
  {
    name: 'Cooking & Food Adventures',
    description: 'Share recipes, cooking tips, restaurant reviews, and culinary experiments.',
    genreName: 'Fiction',
    category: 'Food'
  },
  {
    name: 'Travel Stories & Tips',
    description: 'Share travel experiences, destination guides, and plan your next adventure.',
    genreName: 'Fiction',
    category: 'Travel'
  },
  {
    name: 'Gaming Community',
    description: 'Discuss video games, share strategies, and connect with fellow gamers.',
    genreName: 'Fiction',
    category: 'Gaming'
  },

  // 🌍 Current Events & Culture
  {
    name: 'Pop Culture Watch',
    description: 'Discuss movies, TV shows, celebrities, and the latest entertainment news.',
    genreName: 'Fiction',
    category: 'Entertainment'
  },
  {
    name: 'Tech & Innovation Talk',
    description: 'Explore new gadgets, software, AI developments, and technological advancements.',
    genreName: 'Science Fiction',
    category: 'Technology'
  },
  {
    name: 'Environmental Warriors',
    description: 'Discuss climate change, sustainability, eco-friendly living, and environmental activism.',
    genreName: 'Fiction',
    category: 'Environment'
  },
  {
    name: 'Political Discourse',
    description: 'Engage in respectful discussions about current events, policies, and social issues.',
    genreName: 'Fiction',
    category: 'Politics'
  },

  // 💼 Professional & Business
  {
    name: 'Entrepreneurship Hub',
    description: 'Share startup stories, business advice, and connect with aspiring entrepreneurs.',
    genreName: 'Biography',
    category: 'Business'
  },
  {
    name: 'Remote Work Warriors',
    description: 'Discuss work-from-home tips, productivity hacks, and remote team collaboration.',
    genreName: 'Biography',
    category: 'Business'
  },
  {
    name: 'Student Life & Academia',
    description: 'Connect with students, share study tips, and discuss campus life experiences.',
    genreName: 'Fiction',
    category: 'Education'
  },

  // 🎭 Lifestyle & Personal Growth
  {
    name: 'Minimalism & Simple Living',
    description: 'Discuss decluttering, mindful consumption, and living with less but better.',
    genreName: 'Biography',
    category: 'Lifestyle'
  },
  {
    name: 'Spirituality & Mindfulness',
    description: 'Explore meditation, yoga, spiritual practices, and inner peace journeys.',
    genreName: 'Fiction',
    category: 'Spirituality'
  },
  {
    name: 'Pet Parents Club',
    description: 'Share cute pet photos, training tips, and stories about our furry family members.',
    genreName: 'Fiction',
    category: 'Pets'
  },
  {
    name: 'Photography Enthusiasts',
    description: 'Share photos, discuss techniques, and learn from fellow photography lovers.',
    genreName: 'Fiction',
    category: 'Photography'
  },

  // 🌈 Diverse Communities
  {
    name: 'Bookish Moms',
    description: 'Balance motherhood and reading - share recommendations perfect for busy parents.',
    genreName: 'Fiction',
    category: 'Family'
  },
  {
    name: 'Indie Authors Corner',
    description: 'Support independent authors, share self-published books, and discuss writing craft.',
    genreName: 'Fiction',
    category: 'Books'
  },
  {
    name: 'Young Adult Book Club',
    description: 'Discuss YA fiction, coming-of-age stories, and teen literature favorites.',
    genreName: 'Fiction',
    category: 'Books'
  },
  {
    name: 'True Crime Discussions',
    description: 'Analyze real crimes, discuss documentaries, and explore the psychology behind them.',
    genreName: 'Mystery',
    category: 'True Crime'
  },

  // 🎯 Special Interest Groups
  {
    name: 'Comic Book Collectors',
    description: 'Discuss Marvel, DC, indie comics, and the world of graphic novels.',
    genreName: 'Fiction',
    category: 'Comics'
  },
  {
    name: 'Board Game Enthusiasts',
    description: 'Share game recommendations, strategies, and organize virtual game nights.',
    genreName: 'Fiction',
    category: 'Games'
  },
  {
    name: 'Plant Parents Society',
    description: 'Share plant care tips, identify species, and build our green communities.',
    genreName: 'Fiction',
    category: 'Gardening'
  }
];

export async function seedPermanentRooms() {
  console.log('🏠 Creating permanent community rooms...');

  try {
    // Get an existing user to be the host (use the first admin user)
    let hostUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!hostUser) {
      // If no admin, get any user
      hostUser = await prisma.user.findFirst();
    }

    if (!hostUser) {
      console.log('❌ No users found in database. Please ensure users exist before seeding rooms.');
      return;
    }

    console.log(`Using host user: ${hostUser.name} (${hostUser.email})`);

    let createdCount = 0;
    const results = [];

    for (const roomData of permanentRooms) {
      try {
        // Get or create genre
        let genre = await prisma.genre.findFirst({
          where: { name: roomData.genreName }
        });

        if (!genre) {
          genre = await prisma.genre.create({
            data: { name: roomData.genreName }
          });
        }

        // Check if room already exists
        const existingRoom = await prisma.room.findFirst({
          where: { name: roomData.name }
        });

        if (!existingRoom) {
          const room = await prisma.room.create({
            data: {
              name: roomData.name,
              description: roomData.description,
              genreId: genre.id,
              hostId: hostUser.id,
              isLive: true,
            },
            include: {
              host: { select: { name: true } },
              genre: true,
              _count: { select: { messages: true, participants: true } }
            }
          });

          // Add the host as a participant
          await prisma.participant.create({
            data: {
              userId: hostUser.id,
              roomId: room.id,
            }
          });

          results.push(room);
          createdCount++;
          console.log(`✅ Created: ${room.name}`);
        } else {
          console.log(`⏭️  Already exists: ${roomData.name}`);
        }
      } catch (error) {
        console.warn(`Failed to create room "${roomData.name}":`, error);
      }
    }

    console.log(`🏠 Successfully created ${createdCount} permanent community rooms`);
    console.log(`📊 Total active rooms: ${results.length}`);

    // Log room categories for verification
    const categoryStats = {};
    results.forEach(room => {
      const category = permanentRooms.find(r => r.name === room.name)?.category || 'Other';
      categoryStats[category] = (categoryStats[category] || 0) + 1;
    });

    console.log('\n📈 Room Categories:');
    Object.entries(categoryStats).forEach(([category, count]) => {
      console.log(`  ${category}: ${count} rooms`);
    });

  } catch (error) {
    console.error('❌ Error seeding permanent rooms:', error);
  }
}

// Run if called directly
if (require.main === module) {
  seedPermanentRooms()
    .then(() => {
      console.log('🏠 Permanent rooms seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Permanent rooms seeding failed:', error);
      process.exit(1);
    });
}