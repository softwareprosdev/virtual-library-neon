import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();

interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  url: string;
  image: string;
  duration: number;
  user: {
    name: string;
    url: string;
  };
  video_files: Array<{
    quality: string;
    file_type: string;
    link: string;
  }>;
}

// Categories for diverse content
const VIDEO_CATEGORIES = [
  'technology', 'education', 'entertainment', 'music', 'sports', 
  'travel', 'food', 'fashion', 'comedy', 'news',
  'gaming', 'science', 'nature', 'business', 'health'
];

// Sample trending hashtags
const TRENDING_HASHTAGS = [
  'fyp', 'viral', 'trending', 'explore', 'foryou',
  'new', 'learnontiktok', 'tech', 'dance', 'comedy',
  'lifestyle', 'fitness', 'cooking', 'pets', 'art',
  'gaming', 'music', 'travel', 'food', 'fashion'
];

export async function seedPexelsVideos() {
  console.log('🎬 Starting Pexels video seeding...');
  
  try {
    // Get diverse videos from Pexels
    const videos: PexelsVideo[] = [];
    
    // Fetch videos across different categories
    for (const category of VIDEO_CATEGORIES.slice(0, 10)) {
      try {
        const response = await axios.get('https://api.pexels.com/videos/search', {
          params: {
            query: category,
            per_page: 20,
            orientation: 'portrait', // For mobile-first content
            size: 'medium',
            min_duration: 10,
            max_duration: 60
          },
          headers: {
            'Authorization': process.env.PEXELS_API_KEY
          }
        });
        
        videos.push(...response.data.videos);
      } catch (error) {
        console.warn(`Failed to fetch videos for category: ${category}`, error);
      }
    }

    console.log(`📹 Fetched ${videos.length} videos from Pexels`);

    // Create demo users if they don't exist
    const demoUsers = [];
    for (let i = 1; i <= 10; i++) {
      const existingUser = await prisma.user.findUnique({
        where: { email: `creator${i}@demo.com` }
      });

      if (!existingUser) {
        const user = await prisma.user.create({
          data: {
            email: `creator${i}@demo.com`,
            name: `Creator${i}`,
            displayName: `Demo Creator ${i}`,
            username: `creator${i}`,
            avatarUrl: `https://ui-avatars.com/api/?name=Creator${i}&background=random`,
            isEmailVerified: true
          }
        });
        demoUsers.push(user);
      } else {
        demoUsers.push(existingUser);
      }
    }

    // Create videos from Pexels content
    let createdCount = 0;
    for (let i = 0; i < Math.min(videos.length, 200); i++) {
      const pexelsVideo = videos[i];
      const randomUser = demoUsers[Math.floor(Math.random() * demoUsers.length)];
      
      try {
        // Get random hashtags
        const randomHashtags = TRENDING_HASHTAGS
          .sort(() => 0.5 - Math.random())
          .slice(0, Math.floor(Math.random() * 4) + 2);

        const video = await prisma.video.create({
          data: {
            userId: randomUser.id,
            videoUrl: pexelsVideo.video_files[0]?.link || pexelsVideo.url,
            thumbnailUrl: pexelsVideo.image,
            duration: Math.round(pexelsVideo.duration),
            width: pexelsVideo.width,
            height: pexelsVideo.height,
            aspectRatio: pexelsVideo.width > pexelsVideo.height ? '16:9' : '9:16',
            caption: generateRandomCaption(randomHashtags),
            hashtags: randomHashtags,
            visibility: 'PUBLIC',
            allowDuet: true,
            allowStitch: true,
            allowComments: true,
            processingStatus: 'COMPLETED',
            categoryScores: {
              source: 'pexels',
              pexelsId: pexelsVideo.id.toString()
            }
          }
        });

        // Increment engagement score for better discoverability
        await updateVideoEngagementScore(video.id);
        createdCount++;

        // Create some views, likes, and comments for realism
        await createEngagementData(video.id);

      } catch (error) {
        console.warn(`Failed to create video ${i}:`, error);
      }
    }

    console.log(`✅ Successfully created ${createdCount} demo videos`);
    
    // Create some sounds from popular audio libraries
    await seedPopularSounds();

  } catch (error) {
    console.error('❌ Error seeding Pexels videos:', error);
  }
}

function generateRandomCaption(hashtags: string[]): string {
  const captions = [
    `Check this out! ${hashtags.map(tag => `#${tag}`).join(' ')}`,
    `New post just dropped! ${hashtags.slice(0, 2).map(tag => `#${tag}`).join(' ')}`,
    `What do you think about this? ${hashtags.map(tag => `#${tag}`).join(' ')}`,
    `Trending right now! ${hashtags.map(tag => `#${tag}`).join(' ')}`,
    `Had to share this! ${hashtags.map(tag => `#${tag}`).join(' ')}`,
  ];
  
  return captions[Math.floor(Math.random() * captions.length)];
}

async function createEngagementData(videoId: string) {
  const randomUsers = await prisma.user.findMany({
    where: { id: { not: null } },
    take: 50
  });

  // Create random views (100-1000 views)
  const viewCount = Math.floor(Math.random() * 900) + 100;
  for (let i = 0; i < viewCount; i++) {
    const randomUser = randomUsers[Math.floor(Math.random() * randomUsers.length)];
    
    await prisma.videoView.create({
      data: {
        videoId,
        userId: randomUser?.id,
        watchTime: Math.floor(Math.random() * 30) + 5,
        completed: Math.random() > 0.7
      }
    });
  }

  // Create random likes (10-100 likes)
  const likeCount = Math.floor(Math.random() * 90) + 10;
  for (let i = 0; i < likeCount; i++) {
    const randomUser = randomUsers[Math.floor(Math.random() * randomUsers.length)];
    
    if (randomUser) {
      await prisma.videoLike.create({
        data: {
          videoId,
          userId: randomUser.id
        }
      });
    }
  }

  // Create random comments (5-20 comments)
  const commentCount = Math.floor(Math.random() * 15) + 5;
  const comments = [
    'This is amazing! 🔥',
    'Love this content! 💕',
    'Can you make a tutorial?',
    'First time here, great stuff!',
    'This deserves to go viral!',
    'How did you even do this?! 🤯',
    'Need this in my life ASAP',
    'Mind = blown 🤯',
    'This is next level!',
  ];

  for (let i = 0; i < commentCount; i++) {
    const randomUser = randomUsers[Math.floor(Math.random() * randomUsers.length)];
    
    if (randomUser) {
      await prisma.videoComment.create({
        data: {
          videoId,
          userId: randomUser.id,
          content: comments[Math.floor(Math.random() * comments.length)]
        }
      });
    }
  }
}

async function seedPopularSounds() {
  const popularSounds = [
    { title: 'Original Audio', artistName: 'Trending Artist' },
    { title: 'Beat Drop', artistName: 'DJ Mix' },
    { title: 'Chill Vibes', artistName: 'Ambient' },
    { title: 'Upbeat Energy', artistName: 'Pop Star' },
    { title: 'Dark Mode', artistName: 'Electronic' },
    { title: 'Summer Hits', artistName: 'Tropical House' },
    { title: 'Lo-fi Study', artistName: 'Chill Beats' },
    { title: 'Dance Floor', artistName: 'Club Mix' },
    { title: 'Acoustic Sessions', artistName: 'Indie Artist' },
    { title: 'Bass Boosted', artistName: 'EDM Master' },
  ];

  for (const sound of popularSounds) {
    await prisma.sound.create({
      data: {
        title: sound.title,
        artistName: sound.artistName,
        audioUrl: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3',
        coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f5?w=300&h=300',
        duration: 30,
        isOriginal: false,
        isTrending: Math.random() > 0.7,
        usageCount: Math.floor(Math.random() * 1000) + 50
      }
    });
  }

  console.log('🎵 Seeded popular sounds');
}

async function updateVideoEngagementScore(videoId: string) {
  const video = await prisma.video.findUnique({
    where: { id: videoId },
    include: {
      _count: {
        select: { likes: true, comments: true, shares: true, views: true }
      }
    }
  });

  if (!video) return;

  const rawScore =
    video._count.likes * 1 +
    video._count.comments * 2 +
    video._count.shares * 3 +
    video._count.views * 0.1;

  const engagementScore = rawScore;

  await prisma.video.update({
    where: { id: videoId },
    data: { engagementScore }
  });
}

// Run seeding if called directly
if (require.main === module) {
  seedPexelsVideos()
    .then(() => {
      console.log('🎉 Video seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}