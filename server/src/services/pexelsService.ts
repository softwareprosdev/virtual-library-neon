/**
 * Pexels Video API Service
 * Provides stock videos to fill the feed when user content is limited
 *
 * Get your free API key at: https://www.pexels.com/api/
 */

export interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  duration: number;
  url: string;
  image: string;
  user: {
    id: number;
    name: string;
    url: string;
  };
  video_files: Array<{
    id: number;
    quality: string;
    file_type: string;
    width: number;
    height: number;
    fps: number;
    link: string;
  }>;
  video_pictures: Array<{
    id: number;
    picture: string;
    nr: number;
  }>;
}

export interface PexelsSearchResponse {
  page: number;
  per_page: number;
  total_results: number;
  url: string;
  videos: PexelsVideo[];
  next_page?: string;
}

// Transform Pexels video to match our video format
export interface TransformedPexelsVideo {
  id: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  aspectRatio: string;
  caption: string;
  hashtags: string[];
  user: {
    id: string;
    name: string;
    displayName: string;
    avatarUrl: string | null;
  };
  source: 'pexels';
  pexelsUrl: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  viewCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
}

const PEXELS_API_URL = 'https://api.pexels.com/videos';

/**
 * Get popular/trending videos from Pexels
 */
export async function getPopularVideos(
  page: number = 1,
  perPage: number = 10
): Promise<TransformedPexelsVideo[]> {
  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey) {
    console.warn('PEXELS_API_KEY not configured - stock videos unavailable');
    return [];
  }

  try {
    const response = await fetch(
      `${PEXELS_API_URL}/popular?page=${page}&per_page=${perPage}`,
      {
        headers: {
          'Authorization': apiKey
        }
      }
    );

    if (!response.ok) {
      console.error('Pexels API error:', response.status, response.statusText);
      return [];
    }

    const data: PexelsSearchResponse = await response.json();
    return data.videos.map(transformPexelsVideo);
  } catch (error) {
    console.error('Failed to fetch Pexels videos:', error);
    return [];
  }
}

/**
 * Search videos on Pexels by query
 */
export async function searchVideos(
  query: string,
  page: number = 1,
  perPage: number = 10,
  orientation?: 'landscape' | 'portrait' | 'square'
): Promise<TransformedPexelsVideo[]> {
  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey) {
    console.warn('PEXELS_API_KEY not configured - stock videos unavailable');
    return [];
  }

  try {
    let url = `${PEXELS_API_URL}/search?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`;

    // For TikTok-style, prefer portrait videos
    if (orientation) {
      url += `&orientation=${orientation}`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': apiKey
      }
    });

    if (!response.ok) {
      console.error('Pexels API error:', response.status, response.statusText);
      return [];
    }

    const data: PexelsSearchResponse = await response.json();
    return data.videos.map(transformPexelsVideo);
  } catch (error) {
    console.error('Failed to search Pexels videos:', error);
    return [];
  }
}

/**
 * Get curated videos for different categories
 */
export async function getCuratedVideos(
  category: 'trending' | 'nature' | 'technology' | 'lifestyle' | 'food' | 'travel',
  page: number = 1,
  perPage: number = 10
): Promise<TransformedPexelsVideo[]> {
  const categoryQueries: Record<string, string> = {
    trending: 'viral social media',
    nature: 'nature landscape beautiful',
    technology: 'technology digital modern',
    lifestyle: 'lifestyle aesthetic vlog',
    food: 'food cooking delicious',
    travel: 'travel adventure explore'
  };

  const query = categoryQueries[category] || 'popular';
  return searchVideos(query, page, perPage, 'portrait');
}

/**
 * Get a mix of videos from different categories
 */
export async function getMixedFeed(
  page: number = 1,
  perPage: number = 10
): Promise<TransformedPexelsVideo[]> {
  const apiKey = process.env.PEXELS_API_KEY;

  if (!apiKey) {
    return [];
  }

  try {
    // Get a mix from popular and search queries
    const queries = ['trending', 'lifestyle', 'nature', 'technology', 'creative'];
    const randomQuery = queries[Math.floor(Math.random() * queries.length)];

    // Alternate between popular and search
    if (page % 2 === 1) {
      return getPopularVideos(page, perPage);
    } else {
      return searchVideos(randomQuery, Math.ceil(page / 2), perPage, 'portrait');
    }
  } catch (error) {
    console.error('Failed to get mixed feed:', error);
    return [];
  }
}

/**
 * Transform Pexels video to our app's video format
 */
function transformPexelsVideo(video: PexelsVideo): TransformedPexelsVideo {
  // Get the best quality video file (prefer HD)
  const hdFile = video.video_files.find(f => f.quality === 'hd') ||
                 video.video_files.find(f => f.quality === 'sd') ||
                 video.video_files[0];

  // Calculate aspect ratio
  const aspectRatio = video.width > video.height
    ? '16:9'
    : video.height > video.width
      ? '9:16'
      : '1:1';

  // Generate relevant hashtags based on video
  const hashtags = ['pexels', 'stockvideo', 'trending'];

  return {
    id: `pexels-${video.id}`,
    videoUrl: hdFile?.link || '',
    thumbnailUrl: video.image || video.video_pictures[0]?.picture || '',
    duration: video.duration,
    aspectRatio,
    caption: `Video by ${video.user.name} on Pexels`,
    hashtags,
    user: {
      id: `pexels-user-${video.user.id}`,
      name: video.user.name,
      displayName: video.user.name,
      avatarUrl: null
    },
    source: 'pexels',
    pexelsUrl: video.url,
    // Stock videos don't have engagement metrics
    likeCount: Math.floor(Math.random() * 1000) + 100,
    commentCount: Math.floor(Math.random() * 50) + 5,
    shareCount: Math.floor(Math.random() * 100) + 10,
    viewCount: Math.floor(Math.random() * 10000) + 1000,
    isLiked: false,
    isBookmarked: false
  };
}

export default {
  getPopularVideos,
  searchVideos,
  getCuratedVideos,
  getMixedFeed
};
