'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';
import VideoFeed from '@/components/Videos/VideoFeed';
import VideoCreator from '@/components/Videos/VideoCreator';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Home, UserCircle, Search, Music2 } from 'lucide-react';

interface Video {
  id: string;
  userId: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  aspectRatio: string;
  caption?: string;
  hashtags: string[];
  mentions: string[];
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
    avatarUrl?: string;
  };
  isLiked: boolean;
  isBookmarked: boolean;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  viewCount: number;
  allowDuet: boolean;
  allowStitch: boolean;
  allowComments: boolean;
  createdAt: string;
}

export default function VideosPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'fyp' | 'following'>('fyp');
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [showCreator, setShowCreator] = useState(false);
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
      const url = cursor ? `${endpoint}?cursor=${cursor}` : endpoint;

      const response = await api(url);
      if (response.ok) {
        const data = await response.json();
        if (cursor) {
          setVideos(prev => [...prev, ...data.videos]);
        } else {
          setVideos(data.videos);
        }
        setNextCursor(data.nextCursor);
        setHasMore(!!data.nextCursor);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    setVideos([]);
    setNextCursor(null);
    fetchVideos();
  }, [activeTab, fetchVideos]);

  const loadMore = useCallback(() => {
    if (hasMore && nextCursor && !loading) {
      fetchVideos(nextCursor);
    }
  }, [hasMore, nextCursor, loading, fetchVideos]);

  const handleVideoCreated = (video: Video) => {
    setVideos(prev => [video, ...prev]);
    setShowCreator(false);
  };

  const handleLike = async (videoId: string) => {
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
            onClick={() => router.push('/explore')}
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
