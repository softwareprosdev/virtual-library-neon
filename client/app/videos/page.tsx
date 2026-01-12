'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';
import VideoFeed from '@/components/Videos/VideoFeed';
import VideoCreator from '@/components/Videos/VideoCreator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Home, UserCircle, Search, Music2, X, TrendingUp, Leaf, Monitor, Sparkles, UtensilsCrossed, Plane, ArrowLeft } from 'lucide-react';

interface Video {
  id: string;
  userId?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  aspectRatio: string;
  caption?: string;
  hashtags: string[];
  mentions?: string[];
  soundId?: string;
  sound?: {
    id: string;
    title: string;
    artistName?: string;
    coverUrl?: string;
  };
  user: {
    id: string;
    name: string;
    displayName?: string;
    avatarUrl?: string | null;
  };
  isLiked: boolean;
  isBookmarked: boolean;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  viewCount: number;
  allowDuet?: boolean;
  allowStitch?: boolean;
  allowComments?: boolean;
  createdAt?: string;
  // Stock video properties
  source?: 'user' | 'pexels';
  pexelsUrl?: string;
}

const VIDEO_CATEGORIES = [
  { id: 'trending', label: 'Trending', icon: TrendingUp },
  { id: 'nature', label: 'Nature', icon: Leaf },
  { id: 'technology', label: 'Tech', icon: Monitor },
  { id: 'lifestyle', label: 'Lifestyle', icon: Sparkles },
  { id: 'food', label: 'Food', icon: UtensilsCrossed },
  { id: 'travel', label: 'Travel', icon: Plane },
];

export default function VideosPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'fyp' | 'following'>('fyp');
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [pexelsPage, setPexelsPage] = useState(1);
  const [showCreator, setShowCreator] = useState(false);
  const [showDiscover, setShowDiscover] = useState(false);
  const [discoverCategory, setDiscoverCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const user = getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  }, []);

  const fetchVideos = useCallback(async (cursor?: string) => {
    try {
      const endpoint = activeTab === 'fyp' ? '/videos/fyp' : '/videos/following';

      // Handle Pexels pagination
      let url: string;
      if (cursor?.startsWith('pexels-page-')) {
        const page = parseInt(cursor.split('-').pop() || '1');
        url = `${endpoint}?page=${page}`;
        setPexelsPage(page);
      } else if (cursor) {
        url = `${endpoint}?cursor=${cursor}&page=${pexelsPage}`;
      } else {
        url = `${endpoint}?page=1`;
        setPexelsPage(1);
      }

      const response = await api(url);
      if (response.ok) {
        const data = await response.json();
        if (cursor) {
          setVideos(prev => [...prev, ...data.videos]);
        } else {
          setVideos(data.videos);
        }
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore !== false && !!data.nextCursor);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, pexelsPage]);

  useEffect(() => {
    setLoading(true);
    setVideos([]);
    setNextCursor(null);
    fetchVideos();
  }, [activeTab, fetchVideos]);

  const loadMore = useCallback(() => {
    if (hasMore && nextCursor && !loading) {
      if (showDiscover) {
        fetchDiscoverVideos(pexelsPage + 1);
      } else {
        fetchVideos(nextCursor);
      }
    }
  }, [hasMore, nextCursor, loading, fetchVideos, showDiscover, pexelsPage]);

  // Fetch discover/stock videos
  const fetchDiscoverVideos = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      let url = `/videos/stock?page=${page}&limit=10`;
      if (discoverCategory) {
        url += `&category=${discoverCategory}`;
      } else if (searchQuery.trim()) {
        url += `&query=${encodeURIComponent(searchQuery.trim())}`;
      }

      const response = await api(url);
      if (response.ok) {
        const data = await response.json();
        if (page > 1) {
          setVideos(prev => [...prev, ...data.videos]);
        } else {
          setVideos(data.videos);
        }
        setPexelsPage(page);
        setHasMore(data.hasMore);
        setNextCursor(data.hasMore ? `page-${page + 1}` : null);
      }
    } catch (error) {
      console.error('Error fetching discover videos:', error);
    } finally {
      setLoading(false);
    }
  }, [discoverCategory, searchQuery]);

  // When discover mode or category changes, fetch new videos
  useEffect(() => {
    if (showDiscover) {
      fetchDiscoverVideos(1);
    }
  }, [showDiscover, discoverCategory, fetchDiscoverVideos]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setDiscoverCategory(null);
      fetchDiscoverVideos(1);
    }
  };

  const handleVideoCreated = (video: Video) => {
    setVideos(prev => [video, ...prev]);
    setShowCreator(false);
  };

  const handleLike = async (videoId: string) => {
    // Skip API call for stock videos
    if (videoId.startsWith('pexels-')) {
      setVideos(prev => prev.map(v => {
        if (v.id === videoId) {
          return {
            ...v,
            isLiked: !v.isLiked,
            likeCount: v.isLiked ? v.likeCount - 1 : v.likeCount + 1
          };
        }
        return v;
      }));
      return;
    }

    try {
      const response = await api(`/videos/${videoId}/like`, { method: 'POST' });
      if (response.ok) {
        const { liked } = await response.json();
        setVideos(prev => prev.map(v => {
          if (v.id === videoId) {
            return {
              ...v,
              isLiked: liked,
              likeCount: liked ? v.likeCount + 1 : v.likeCount - 1
            };
          }
          return v;
        }));
      }
    } catch (error) {
      console.error('Error liking video:', error);
    }
  };

  const handleBookmark = async (videoId: string) => {
    // Skip API call for stock videos
    if (videoId.startsWith('pexels-')) {
      setVideos(prev => prev.map(v => {
        if (v.id === videoId) {
          return { ...v, isBookmarked: !v.isBookmarked };
        }
        return v;
      }));
      return;
    }

    try {
      const response = await api(`/videos/${videoId}/bookmark`, { method: 'POST' });
      if (response.ok) {
        const { bookmarked } = await response.json();
        setVideos(prev => prev.map(v => {
          if (v.id === videoId) {
            return { ...v, isBookmarked: bookmarked };
          }
          return v;
        }));
      }
    } catch (error) {
      console.error('Error bookmarking video:', error);
    }
  };

  const handleShare = async (videoId: string, platform?: string) => {
    // For stock videos, just update local state
    if (videoId.startsWith('pexels-')) {
      setVideos(prev => prev.map(v => {
        if (v.id === videoId) {
          return { ...v, shareCount: v.shareCount + 1 };
        }
        return v;
      }));
      return;
    }

    try {
      await api(`/videos/${videoId}/share`, {
        method: 'POST',
        body: JSON.stringify({ platform })
      });
      setVideos(prev => prev.map(v => {
        if (v.id === videoId) {
          return { ...v, shareCount: v.shareCount + 1 };
        }
        return v;
      }));
    } catch (error) {
      console.error('Error sharing video:', error);
    }
  };

  const handleView = async (videoId: string, watchTime: number, completed: boolean) => {
    // Skip API call for stock videos
    if (videoId.startsWith('pexels-')) return;

    try {
      await api(`/videos/${videoId}/view`, {
        method: 'POST',
        body: JSON.stringify({ watchTime, completed })
      });
    } catch (error) {
      console.error('Error recording view:', error);
    }
  };

  if (showCreator) {
    return (
      <VideoCreator
        onClose={() => setShowCreator(false)}
        onVideoCreated={handleVideoCreated}
      />
    );
  }

  // Discover View
  if (showDiscover) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col">
        {/* Discover Header */}
        <div className="safe-area-top bg-black/90 backdrop-blur-sm border-b border-white/10">
          <div className="flex items-center gap-3 p-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-white"
              onClick={() => {
                setShowDiscover(false);
                setDiscoverCategory(null);
                setSearchQuery('');
              }}
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                <Input
                  type="text"
                  placeholder="Search videos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/10 border-white/20 text-white placeholder:text-white/50 pl-10 pr-10"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setDiscoverCategory('trending');
                      fetchDiscoverVideos(1);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Categories */}
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
            {VIDEO_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = discoverCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setDiscoverCategory(cat.id);
                    setSearchQuery('');
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-white text-black'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Video Feed */}
        {loading && videos.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : videos.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-white text-center px-4">
            <div>
              <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No videos found</h3>
              <p className="text-white/60">Try a different search or category</p>
            </div>
          </div>
        ) : (
          <VideoFeed
            videos={videos}
            currentUserId={currentUserId}
            onLike={handleLike}
            onBookmark={handleBookmark}
            onShare={handleShare}
            onView={handleView}
            onLoadMore={loadMore}
            hasMore={hasMore}
          />
        )}

        {/* Bottom Navigation */}
        <div className="absolute bottom-0 left-0 right-0 z-50 safe-area-bottom">
          <div className="flex items-center justify-around py-2 px-4 bg-black/80 backdrop-blur-sm">
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center text-white/60 hover:text-white"
              onClick={() => router.push('/feed')}
            >
              <Home className="w-6 h-6" />
              <span className="text-xs mt-1">Home</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center text-white hover:text-white"
            >
              <Search className="w-6 h-6" />
              <span className="text-xs mt-1">Discover</span>
            </Button>

            <Button
              size="lg"
              className="rounded-lg bg-gradient-to-r from-pink-500 to-cyan-500 hover:from-pink-600 hover:to-cyan-600"
              onClick={() => setShowCreator(true)}
            >
              <Plus className="w-6 h-6" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center text-white/60 hover:text-white"
              onClick={() => setShowDiscover(false)}
            >
              <Music2 className="w-6 h-6" />
              <span className="text-xs mt-1">Videos</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center text-white/60 hover:text-white"
              onClick={() => currentUserId && router.push(`/profile/${currentUserId}`)}
            >
              <UserCircle className="w-6 h-6" />
              <span className="text-xs mt-1">Profile</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 safe-area-top">
        <div className="flex items-center justify-center pt-4 px-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'fyp' | 'following')}>
            <TabsList className="bg-transparent border-none">
              <TabsTrigger
                value="following"
                className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-transparent"
              >
                Following
              </TabsTrigger>
              <TabsTrigger
                value="fyp"
                className="text-white/60 data-[state=active]:text-white data-[state=active]:bg-transparent"
              >
                For You
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Video Feed */}
      {loading && videos.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      ) : videos.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-white text-center px-4">
          <div>
            <Music2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No videos yet</h3>
            <p className="text-white/60 mb-4">
              {activeTab === 'following'
                ? 'Follow creators to see their videos here'
                : 'Be the first to share a video!'}
            </p>
            <Button onClick={() => setShowCreator(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Video
            </Button>
          </div>
        </div>
      ) : (
        <VideoFeed
          videos={videos}
          currentUserId={currentUserId}
          onLike={handleLike}
          onBookmark={handleBookmark}
          onShare={handleShare}
          onView={handleView}
          onLoadMore={loadMore}
          hasMore={hasMore}
        />
      )}

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 z-50 safe-area-bottom">
        <div className="flex items-center justify-around py-2 px-4 bg-black/80 backdrop-blur-sm">
          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center text-white/60 hover:text-white"
            onClick={() => router.push('/feed')}
          >
            <Home className="w-6 h-6" />
            <span className="text-xs mt-1">Home</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center text-white/60 hover:text-white"
            onClick={() => {
              setShowDiscover(true);
              setDiscoverCategory('trending');
            }}
          >
            <Search className="w-6 h-6" />
            <span className="text-xs mt-1">Discover</span>
          </Button>

          <Button
            size="lg"
            className="rounded-lg bg-gradient-to-r from-pink-500 to-cyan-500 hover:from-pink-600 hover:to-cyan-600"
            onClick={() => setShowCreator(true)}
          >
            <Plus className="w-6 h-6" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center text-white hover:text-white"
          >
            <Music2 className="w-6 h-6" />
            <span className="text-xs mt-1">Videos</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="flex flex-col items-center text-white/60 hover:text-white"
            onClick={() => currentUserId && router.push(`/profile/${currentUserId}`)}
          >
            <UserCircle className="w-6 h-6" />
            <span className="text-xs mt-1">Profile</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
