"use client"

import { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, Play, Heart, MessageCircle, User, Eye } from 'lucide-react';
import { api } from '@/lib/api';
import VideoPlayer from '@/components/Videos/VideoPlayer';

interface PexelsVideo {
  id: string;
  title: string;
  thumbnailUrl: string;
  videoUrl: string;
  duration: number;
  width: number;
  height: number;
  aspectRatio: string;
  source: string;
  attribution?: {
    photographer: string;
    photographerUrl: string;
  };
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

export default function VideosPage() {
  const [videos, setVideos] = useState<PexelsVideo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('popular');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalVideos, setTotalVideos] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Video player state
  const [selectedVideo, setSelectedVideo] = useState<PexelsVideo | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  useEffect(() => {
    loadCategories();
    loadVideos('popular', '', 1);
  }, []);

  // Handle Escape key to close video player
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isPlayerOpen) {
        handleClosePlayer();
      }
    };

    if (isPlayerOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isPlayerOpen]);

  const loadCategories = async () => {
    try {
      const response = await api('/pexels/categories') as any;
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
      } else {
        setCategories([
          { id: 'popular', name: 'Trending Now', icon: '🔥' },
          { id: 'EDUCATION', name: 'Education', icon: '📚' },
          { id: 'ENTERTAINMENT', name: 'Entertainment', icon: '🎭' },
          { id: 'MUSIC', name: 'Music', icon: '🎵' },
          { id: 'SPORTS', name: 'Sports', icon: '⚽' },
          { id: 'FOOD', name: 'Food', icon: '🍕' },
          { id: 'TRAVEL', name: 'Travel', icon: '✈️' },
          { id: 'FASHION', name: 'Fashion', icon: '👗' },
          { id: 'TECH', name: 'Technology', icon: '💻' },
          { id: 'GAMING', name: 'Gaming', icon: '🎮' },
          { id: 'COMEDY', name: 'Comedy', icon: '😂' },
          { id: 'DIY', name: 'DIY', icon: '🔨' },
          { id: 'NEWS', name: 'News', icon: '📰' },
          { id: 'OTHER', name: 'Other', icon: '📂' },
        ]);
      }
    } catch (error) {
      setCategories([
        { id: 'popular', name: 'Trending Now', icon: '🔥' },
        { id: 'EDUCATION', name: 'Education', icon: '📚' },
        { id: 'ENTERTAINMENT', name: 'Entertainment', icon: '🎭' },
        { id: 'MUSIC', name: 'Music', icon: '🎵' },
        { id: 'SPORTS', name: 'Sports', icon: '⚽' },
        { id: 'FOOD', name: 'Food', icon: '🍕' },
        { id: 'TRAVEL', name: 'Travel', icon: '✈️' },
        { id: 'FASHION', name: 'Fashion', icon: '👗' },
        { id: 'TECH', name: 'Technology', icon: '💻' },
        { id: 'GAMING', name: 'Gaming', icon: '🎮' },
        { id: 'COMEDY', name: 'Comedy', icon: '😂' },
        { id: 'DIY', name: 'DIY', icon: '🔨' },
        { id: 'NEWS', name: 'News', icon: '📰' },
        { id: 'OTHER', name: 'Other', icon: '📂' },
      ]);
    }
  };

  const loadVideos = async (category: string, query: string, pageNum: number = 1) => {
    setLoading(true);
    try {
      // For our platform categories, use our API; for stock categories, use Pexels
      let endpoint: string;
      let params: URLSearchParams;

      if (category === 'popular' || category === 'nature' || category === 'technology' || category === 'music' || category === 'sports') {
        // Pexels stock categories
        endpoint = query ? '/pexels/search' : '/pexels/trending';
        params = new URLSearchParams({
          page: pageNum.toString(),
          per_page: '20',
          ...(query && { query }),
          ...(category && category !== 'popular' && { category })
        });
      } else {
        // Our platform categories - use our database
        endpoint = `/videos/category/${category}`;
        params = new URLSearchParams({
          page: pageNum.toString(),
          limit: '20',
          ...(query && { query })
        });
      }

      const response = await api(`${endpoint}?${params}`) as any;

      if (response.ok) {
        const data = await response.json();
        if (data.error) {
          console.error('API Error:', data.message);
          setVideos([]);
          setTotalVideos(0);
        } else {
          setVideos(prev => pageNum === 1 ? data.videos : [...prev, ...data.videos]);
          setTotalVideos(data.totalVideos || data.videos.length);
          setPage(pageNum);
          setHasMore(data.hasMore || data.videos.length === 20);
        }
      } else {
        console.error('API request failed');
        setVideos([]);
        setTotalVideos(0);
      }
    } catch (error) {
      console.error('Failed to load videos:', error);
      setVideos([]);
      setTotalVideos(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    setVideos([]);
    loadVideos(selectedCategory, searchQuery, 1);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setPage(1);
    setVideos([]);
    loadVideos(category, searchQuery, 1);
  };

  const handleLoadMore = () => {
    loadVideos(selectedCategory, searchQuery, page + 1);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVideoClick = (video: PexelsVideo) => {
    setSelectedVideo(video);
    setIsPlayerOpen(true);
  };

  const handleClosePlayer = () => {
    setIsPlayerOpen(false);
    setSelectedVideo(null);
  };

  // Get related videos (same category or similar)
  const getRelatedVideos = (currentVideo: PexelsVideo) => {
    return videos
      .filter(video => video.id !== currentVideo.id)
      .sort(() => Math.random() - 0.5) // Randomize order
      .slice(0, 8); // Show up to 8 related videos
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">Browse Videos</h1>
              <Badge variant="secondary" className="hidden sm:flex">
                {totalVideos.toLocaleString()} videos
              </Badge>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search for amazing videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  onClick={() => handleCategoryChange(category.id)}
                  size="sm"
                  className="whitespace-nowrap"
                >
                  <span className="mr-1">{category.icon}</span>
                  {category.name}
                </Button>
              ))}
            </div>

            {/* Search Button */}
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Search
            </Button>
          </div>
        </div>

        {/* Video Grid */}
        <div className="container mx-auto px-4 pb-8">
          {loading && videos.length === 0 ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : videos.length === 0 && !loading ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">
                {totalVideos === 0 && !loading ?
                  'Stock video service is not configured. Please contact the administrator.' :
                  'No videos found'
                }
              </div>
              {totalVideos === 0 && !loading ? (
                <Button onClick={() => window.location.href = '/feed'}>
                  Go to User Videos
                </Button>
              ) : (
                <Button onClick={() => loadVideos('popular', '', 1)}>
                  Try trending videos
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {videos.map((video) => (
                  <Card
                    key={video.id}
                    className="group cursor-pointer overflow-hidden border-border hover:border-secondary transition-all hover:shadow-lg"
                    onClick={() => handleVideoClick(video)}
                  >
                    <CardHeader className="p-0">
                       {/* Video Thumbnail */}
                       <div className="relative">
                         <img
                           src={video.thumbnailUrl}
                           alt={video.title}
                           className="w-full h-48 object-cover"
                           loading="lazy"
                           onError={(e) => {
                             // Fallback to a placeholder if thumbnail fails to load
                             const target = e.target as HTMLImageElement;
                             target.src = `https://via.placeholder.com/400x225/1a1a1a/ffffff?text=${encodeURIComponent(video.title.substring(0, 20))}`;
                           }}
                         />
                        {/* Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-xs">
                            <span className="bg-black/50 px-2 py-1 rounded">
                              {formatDuration(video.duration)}
                            </span>
                            <div className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              <span className="bg-black/50 px-2 py-1 rounded">
                                {Math.floor(Math.random() * 900) + 100}
                              </span>
                            </div>
                          </div>
                        </div>
                        {/* Play Button Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-white/20 rounded-full p-3">
                            <Play className="h-6 w-6 text-white fill-white" />
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      {/* Video Title */}
                      <CardTitle className="text-base mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {video.title}
                      </CardTitle>

                      {/* Attribution */}
                      {video.source === 'pexels' && video.attribution && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                          <span>Video by</span>
                          <a
                            href={video.attribution.photographerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {video.attribution.photographer}
                          </a>
                          <span>on Pexels</span>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="gap-1">
                          <Heart className="h-3 w-3" />
                          {Math.floor(Math.random() * 90) + 10}
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {Math.floor(Math.random() * 20) + 5}
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                          <User className="h-3 w-3" />
                          {Math.floor(Math.random() * 50) + 20}
                        </Badge>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mt-3">
                        <Badge variant="secondary" className="text-xs">
                          {video.aspectRatio}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {video.source}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {formatDuration(video.duration)}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && videos.length >= 20 && (
                <div className="flex justify-center mt-8">
                  <Button
                    onClick={handleLoadMore}
                    disabled={loading}
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      'Load More Videos'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Video Player Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 bg-black/95 flex">
          {/* Main Video Player */}
          <div className="flex-1 flex items-center justify-center p-4">
            <VideoPlayer
              video={selectedVideo}
              isOpen={isPlayerOpen}
              onClose={handleClosePlayer}
              autoPlay={true}
            />
          </div>

          {/* Related Videos Sidebar */}
          {isPlayerOpen && (
            <div className="w-80 bg-background border-l border-border overflow-y-auto">
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  Up Next
                </h3>
                <div className="space-y-3">
                  {getRelatedVideos(selectedVideo).map((video) => (
                    <Card
                      key={video.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        setSelectedVideo(video);
                        // VideoPlayer will automatically reload with new video
                      }}
                    >
                      <div className="flex gap-3 p-3">
                        <div className="relative w-20 h-12 flex-shrink-0">
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className="w-full h-full object-cover rounded"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = `https://via.placeholder.com/80x48/1a1a1a/ffffff?text=Video`;
                            }}
                          />
                          <div className="absolute inset-0 bg-black/20 rounded flex items-center justify-center">
                            <Play className="h-3 w-3 text-white fill-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-2 leading-tight">
                            {video.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDuration(video.duration)}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Close button for sidebar */}
                <div className="mt-4 pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={handleClosePlayer}
                    className="w-full"
                  >
                    Close Player
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </MainLayout>
  );
}