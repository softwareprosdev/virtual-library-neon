"use client"

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Play, Eye, Heart, MessageCircle, User, Search, Filter, TrendingUp } from 'lucide-react';
import MainLayout from '@/components/MainLayout';
import { api } from '@/lib/api';

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

  useEffect(() => {
    loadCategories();
    loadVideos('popular', '', 1);
  }, []);

  const loadCategories = async () => {
    try {
      const response = await api('/pexels/categories') as any;
      setCategories(response.categories);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadVideos = async (category: string, query: string, pageNum: number = 1) => {
    setLoading(true);
    try {
      const endpoint = query ? '/pexels/search' : '/pexels/trending';
      const params = new URLSearchParams({
        page: pageNum.toString(),
        per_page: '20',
        ...(query && { query }),
        ...(category && { category })
      });

      const response = await api(`${endpoint}?${params}`) as any;
      setVideos(prev => pageNum === 1 ? response.videos : [...prev, ...response.videos]);
      setTotalVideos(response.totalVideos);
      setPage(pageNum);
      setHasMore(response.videos.length === 20);
    } catch (error) {
      console.error('Failed to load videos:', error);
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

  const handleVideoClick = async (video: PexelsVideo) => {
    // In a real app, this would open video player
    // For now, just show alert
    alert(`Would play: ${video.title}\n\nThis would open the video player where users can:\n- View the full video\n- Like/comment/share\n- Use sounds from this video\n- Create duets/stitches\n\nVideo ID: ${video.id}`);
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
            <Select value={selectedCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      <span>{category.icon}</span>
                      <span>{category.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
          ) : videos.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground mb-4">No videos found</div>
              <Button onClick={() => loadVideos('popular', '', 1)}>
                Try trending videos
              </Button>
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
                      <Filter className="mr-2 h-4 w-4" />
                    )}
                    Load More Videos
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
}