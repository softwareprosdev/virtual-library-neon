'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Music2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  MoreHorizontal,
  UserPlus
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import CommentSheet from './CommentSheet';
import ShareSheet from './ShareSheet';

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

interface VideoCardProps {
  video: Video;
  isActive: boolean;
  currentUserId: string | null;
  onLike: () => void;
  onBookmark: () => void;
  onShare: (platform?: string) => void;
  onView: (watchTime: number, completed: boolean) => void;
}

export default function VideoCard({
  video,
  isActive,
  currentUserId,
  onLike,
  onBookmark,
  onShare,
  onView
}: VideoCardProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showHeart, setShowHeart] = useState(false);
  const watchTimeRef = useRef(0);
  const lastTimeRef = useRef(0);
  const viewRecordedRef = useRef(false);

  // Handle play/pause based on active state
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    if (isActive) {
      vid.play().catch(() => {});
      setIsPlaying(true);
    } else {
      vid.pause();
      vid.currentTime = 0;
      setIsPlaying(false);

      // Record view when leaving
      if (watchTimeRef.current > 0 && !viewRecordedRef.current) {
        onView(watchTimeRef.current, progress >= 0.95);
        viewRecordedRef.current = true;
      }
      watchTimeRef.current = 0;
      viewRecordedRef.current = false;
    }
  }, [isActive]);

  // Track watch time
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !isActive) return;

    const handleTimeUpdate = () => {
      const current = vid.currentTime;
      setProgress(current / vid.duration);

      // Calculate watch time
      const timeDiff = current - lastTimeRef.current;
      if (timeDiff > 0 && timeDiff < 2) {
        watchTimeRef.current += timeDiff;
      }
      lastTimeRef.current = current;
    };

    vid.addEventListener('timeupdate', handleTimeUpdate);
    return () => vid.removeEventListener('timeupdate', handleTimeUpdate);
  }, [isActive]);

  // Handle video end - loop
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    const handleEnded = () => {
      vid.currentTime = 0;
      vid.play().catch(() => {});
    };

    vid.addEventListener('ended', handleEnded);
    return () => vid.removeEventListener('ended', handleEnded);
  }, []);

  const togglePlayPause = () => {
    const vid = videoRef.current;
    if (!vid) return;

    if (isPlaying) {
      vid.pause();
    } else {
      vid.play().catch(() => {});
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const vid = videoRef.current;
    if (vid) {
      vid.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleDoubleTap = () => {
    if (!video.isLiked) {
      onLike();
    }
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 1000);
  };

  const formatCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="relative h-full w-full bg-black">
      {/* Video */}
      <video
        ref={videoRef}
        src={video.videoUrl}
        className="absolute inset-0 w-full h-full object-cover"
        loop
        muted={isMuted}
        playsInline
        poster={video.thumbnailUrl}
        onClick={togglePlayPause}
        onDoubleClick={handleDoubleTap}
      />

      {/* Progress bar */}
      <div className="absolute bottom-20 left-0 right-0 h-1 bg-white/20">
        <div
          className="h-full bg-white transition-all duration-100"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Heart animation on double tap */}
      {showHeart && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Heart className="w-24 h-24 text-red-500 fill-red-500 animate-ping" />
        </div>
      )}

      {/* Play/Pause indicator */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
          <Play className="w-20 h-20 text-white/80" />
        </div>
      )}

      {/* Right side actions */}
      <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6">
        {/* User avatar */}
        <div className="relative">
          <Avatar
            className="w-12 h-12 border-2 border-white cursor-pointer"
            onClick={() => router.push(`/profile/${video.user.id}`)}
          >
            <AvatarImage src={video.user.avatarUrl} />
            <AvatarFallback>
              {(video.user.displayName || video.user.name).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {currentUserId !== video.user.id && (
            <Button
              size="icon"
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-pink-500 hover:bg-pink-600"
            >
              <UserPlus className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* Like */}
        <button
          className="flex flex-col items-center"
          onClick={onLike}
        >
          <div className={`p-2 rounded-full ${video.isLiked ? 'text-red-500' : 'text-white'}`}>
            <Heart className={`w-8 h-8 ${video.isLiked ? 'fill-red-500' : ''}`} />
          </div>
          <span className="text-white text-xs font-semibold">{formatCount(video.likeCount)}</span>
        </button>

        {/* Comments */}
        <button
          className="flex flex-col items-center"
          onClick={() => setShowComments(true)}
        >
          <div className="p-2 text-white">
            <MessageCircle className="w-8 h-8" />
          </div>
          <span className="text-white text-xs font-semibold">{formatCount(video.commentCount)}</span>
        </button>

        {/* Bookmark */}
        <button
          className="flex flex-col items-center"
          onClick={onBookmark}
        >
          <div className={`p-2 ${video.isBookmarked ? 'text-yellow-400' : 'text-white'}`}>
            <Bookmark className={`w-8 h-8 ${video.isBookmarked ? 'fill-yellow-400' : ''}`} />
          </div>
        </button>

        {/* Share */}
        <button
          className="flex flex-col items-center"
          onClick={() => setShowShare(true)}
        >
          <div className="p-2 text-white">
            <Share2 className="w-8 h-8" />
          </div>
          <span className="text-white text-xs font-semibold">{formatCount(video.shareCount)}</span>
        </button>

        {/* Sound */}
        {video.sound && (
          <div
            className="w-12 h-12 rounded-full bg-gradient-to-r from-gray-800 to-gray-600 animate-spin-slow flex items-center justify-center cursor-pointer"
            onClick={() => router.push(`/sounds/${video.sound!.id}`)}
          >
            {video.sound.coverUrl ? (
              <img
                src={video.sound.coverUrl}
                alt={video.sound.title}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <Music2 className="w-5 h-5 text-white" />
            )}
          </div>
        )}
      </div>

      {/* Bottom info */}
      <div className="absolute left-4 right-20 bottom-24">
        {/* Username */}
        <div
          className="flex items-center gap-2 cursor-pointer mb-2"
          onClick={() => router.push(`/profile/${video.user.id}`)}
        >
          <span className="text-white font-bold text-lg">
            @{video.user.displayName || video.user.name}
          </span>
        </div>

        {/* Caption */}
        {video.caption && (
          <p className="text-white text-sm mb-2 line-clamp-2">
            {video.caption}
          </p>
        )}

        {/* Hashtags */}
        {video.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {video.hashtags.slice(0, 3).map(tag => (
              <span key={tag} className="text-white/80 text-sm">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Sound */}
        {video.sound && (
          <div className="flex items-center gap-2 text-white/80">
            <Music2 className="w-4 h-4" />
            <marquee className="text-sm max-w-[200px]">
              {video.sound.title} - {video.sound.artistName || 'Original Sound'}
            </marquee>
          </div>
        )}
      </div>

      {/* Top controls */}
      <div className="absolute top-16 right-4 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20"
          onClick={toggleMute}
        >
          {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
        </Button>
      </div>

      {/* Comments Sheet */}
      <CommentSheet
        videoId={video.id}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        allowComments={video.allowComments}
      />

      {/* Share Sheet */}
      <ShareSheet
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        onShare={onShare}
        videoUrl={`${typeof window !== 'undefined' ? window.location.origin : ''}/videos/${video.id}`}
      />
    </div>
  );
}
