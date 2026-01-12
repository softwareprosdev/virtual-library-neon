'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import VideoCard from './VideoCard';

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

interface VideoFeedProps {
  videos: Video[];
  currentUserId: string | null;
  onLike: (videoId: string) => void;
  onBookmark: (videoId: string) => void;
  onShare: (videoId: string, platform?: string) => void;
  onView: (videoId: string, watchTime: number, completed: boolean) => void;
  onLoadMore: () => void;
  hasMore: boolean;
}

export default function VideoFeed({
  videos,
  currentUserId,
  onLike,
  onBookmark,
  onShare,
  onView,
  onLoadMore,
  hasMore
}: VideoFeedProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);
  const isScrolling = useRef(false);

  // Handle swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (isScrolling.current) return;

    const diff = touchStartY.current - touchEndY.current;
    const threshold = 50; // Minimum swipe distance

    if (Math.abs(diff) > threshold) {
      if (diff > 0 && currentIndex < videos.length - 1) {
        // Swipe up - next video
        setCurrentIndex(prev => prev + 1);
      } else if (diff < 0 && currentIndex > 0) {
        // Swipe down - previous video
        setCurrentIndex(prev => prev - 1);
      }
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' && currentIndex < videos.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else if (e.key === 'ArrowUp' && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, videos.length]);

  // Handle wheel scroll
  const handleWheel = useCallback((e: WheelEvent) => {
    if (isScrolling.current) return;

    const threshold = 50;
    if (e.deltaY > threshold && currentIndex < videos.length - 1) {
      isScrolling.current = true;
      setCurrentIndex(prev => prev + 1);
      setTimeout(() => { isScrolling.current = false; }, 500);
    } else if (e.deltaY < -threshold && currentIndex > 0) {
      isScrolling.current = true;
      setCurrentIndex(prev => prev - 1);
      setTimeout(() => { isScrolling.current = false; }, 500);
    }
  }, [currentIndex, videos.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [handleWheel]);

  // Load more when near end
  useEffect(() => {
    if (currentIndex >= videos.length - 2 && hasMore) {
      onLoadMore();
    }
  }, [currentIndex, videos.length, hasMore, onLoadMore]);

  // Scroll to current video
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.style.transform = `translateY(-${currentIndex * 100}%)`;
    }
  }, [currentIndex]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full transition-transform duration-300 ease-out"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {videos.map((video, index) => (
        <div
          key={video.id}
          className="h-full w-full flex-shrink-0"
          style={{ height: '100vh' }}
        >
          <VideoCard
            video={video}
            isActive={index === currentIndex}
            currentUserId={currentUserId}
            onLike={() => onLike(video.id)}
            onBookmark={() => onBookmark(video.id)}
            onShare={(platform) => onShare(video.id, platform)}
            onView={(watchTime, completed) => onView(video.id, watchTime, completed)}
          />
        </div>
      ))}
    </div>
  );
}
