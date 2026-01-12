import { Router, Response } from 'express';
import { authenticateToken } from '../middlewares/auth';
import axios from 'axios';

const router = Router();

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

// Get trending videos from Pexels
router.get('/pexels/trending', authenticateToken, async (req: any, res: Response): Promise<void> => {
  try {
    const { category = 'popular', page = '1', per_page = '20' } = req.query;

    // Check if PEXELS_API_KEY is configured
    if (!process.env.PEXELS_API_KEY) {
      res.status(503).json({
        error: 'Stock video service not configured',
        message: 'Pexels API key is not set. Please contact administrator.'
      });
      return;
    }

    const response = await axios.get('https://api.pexels.com/videos/popular', {
      params: {
        query: category as string,
        page: page as string,
        per_page: per_page as string,
        orientation: 'portrait',
        size: 'medium',
        min_duration: 10,
        max_duration: 60
      },
      headers: {
        'Authorization': process.env.PEXELS_API_KEY
      }
    });

    const videos = response.data.videos.map((video: PexelsVideo) => ({
      id: `pexels_${video.id}`,
      title: `Amazing ${category} video #${video.id}`,
      thumbnailUrl: video.image,
      videoUrl: video.video_files[0]?.link || video.url,
      duration: Math.round(video.duration),
      width: video.width,
      height: video.height,
      aspectRatio: video.width > video.height ? '16:9' : '9:16',
      source: 'pexels',
      attribution: {
        photographer: video.user.name,
        photographerUrl: video.user.url
      }
    }));

    res.json({
      videos,
      page: parseInt(page as string),
      perPage: parseInt(per_page as string),
      totalVideos: response.data.total_results
    });
  } catch (error) {
    console.error('Error fetching Pexels trending videos:', error);
    res.status(500).json({ message: 'Failed to fetch trending videos' });
  }
});

// Search Pexels videos
router.get('/pexels/search', authenticateToken, async (req: any, res: Response): Promise<void> => {
  try {
    const { query, category = 'popular', page = '1', per_page = '20' } = req.query;

    // Check if PEXELS_API_KEY is configured
    if (!process.env.PEXELS_API_KEY) {
      res.status(503).json({
        error: 'Stock video service not configured',
        message: 'Pexels API key is not set. Please contact administrator.'
      });
      return;
    }

    if (!query && category === 'popular') {
      // If no specific query, get trending
      const response = await axios.get('https://api.pexels.com/videos/popular', {
        params: {
          page,
          per_page: per_page,
          orientation: 'portrait',
          size: 'medium',
          min_duration: 10,
          max_duration: 60
        },
        headers: {
          'Authorization': process.env.PEXELS_API_KEY
        }
      });

      const videos = response.data.videos.map((video: PexelsVideo) => ({
        id: `pexels_${video.id}`,
        title: `Trending video #${video.id}`,
        thumbnailUrl: video.image,
        videoUrl: video.video_files[0]?.link || video.url,
        duration: Math.round(video.duration),
        width: video.width,
        height: video.height,
        aspectRatio: video.width > video.height ? '16:9' : '9:16',
        source: 'pexels',
        attribution: {
          photographer: video.user.name,
          photographerUrl: video.user.url
        }
      }));

      res.json({
        videos,
        page: parseInt(page as string),
        perPage: parseInt(per_page as string),
        totalVideos: response.data.total_results
      });
    } else {
      // Search specific query
      const response = await axios.get('https://api.pexels.com/videos/search', {
        params: {
          query: query as string || category as string,
          page,
          per_page: per_page,
          orientation: 'portrait',
          size: 'medium',
          min_duration: 10,
          max_duration: 60
        },
        headers: {
          'Authorization': process.env.PEXELS_API_KEY
        }
      });

      const videos = response.data.videos.map((video: PexelsVideo) => ({
        id: `pexels_${video.id}`,
        title: query ? `${query} video #${video.id}` : `Amazing video #${video.id}`,
        thumbnailUrl: video.image,
        videoUrl: video.video_files[0]?.link || video.url,
        duration: Math.round(video.duration),
        width: video.width,
        height: video.height,
        aspectRatio: video.width > video.height ? '16:9' : '9:16',
        source: 'pexels',
        attribution: {
          photographer: video.user.name,
          photographerUrl: video.user.url
        }
      }));

      res.json({
        videos,
        page: parseInt(page as string),
        perPage: parseInt(per_page as string),
        totalVideos: response.data.total_results,
        query: query || category
      });
    }
  } catch (error) {
    console.error('Error searching Pexels videos:', error);
    res.status(500).json({ message: 'Failed to search videos' });
  }
});

// Get video categories
router.get('/pexels/categories', authenticateToken, async (req: any, res: Response): Promise<void> => {
  try {
    const categories = [
      { id: 'popular', name: 'Trending Now', icon: '🔥' },
      { id: 'nature', name: 'Nature & Wildlife', icon: '🌿' },
      { id: 'education', name: 'Education', icon: '📚' },
      { id: 'technology', name: 'Technology', icon: '💻' },
      { id: 'music', name: 'Music & Dance', icon: '🎵' },
      { id: 'sports', name: 'Sports', icon: '⚽' },
      { id: 'travel', name: 'Travel', icon: '✈️' },
      { id: 'food', name: 'Food & Cooking', icon: '🍕' },
      { id: 'fashion', name: 'Fashion & Style', icon: '👗' },
      { id: 'fitness', name: 'Fitness & Health', icon: '💪' },
      { id: 'comedy', name: 'Comedy', icon: '😄' },
      { id: 'pets', name: 'Pets & Animals', icon: '🐕' },
      { id: 'art', name: 'Art & Design', icon: '🎨' },
      { id: 'gaming', name: 'Gaming', icon: '🎮' },
    ];

    res.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

export default router;