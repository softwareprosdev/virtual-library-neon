'use client';

import { useState, useEffect, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, Heart, Send, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@/lib/api';

interface Story {
  id: string;
  imageUrl?: string;
  text?: string;
  backgroundColor?: string;
  createdAt: string;
  expiresAt: string;
  viewCount: number;
  user: {
    id: string;
    name: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

interface StoryViewerProps {
  stories: Story[];
  onClose: () => void;
}

export default function StoryViewer({ stories, onClose }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const currentStory = stories[currentIndex];
  const STORY_DURATION = 5000; // 5 seconds per story

  // Mark story as viewed
  useEffect(() => {
    if (currentStory) {
      api(`/stories/${currentStory.id}/view`, { method: 'POST' }).catch(console.error);
    }
  }, [currentStory?.id]);

  // Progress bar animation
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          // Move to next story
          if (currentIndex < stories.length - 1) {
            setCurrentIndex((i) => i + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + (100 / (STORY_DURATION / 100));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentIndex, isPaused, stories.length, onClose]);

  // Reset progress when story changes
  useEffect(() => {
    setProgress(0);
  }, [currentIndex]);

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  const goToNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      onClose();
    }
  }, [currentIndex, stories.length, onClose]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') setIsPaused((p) => !p);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevious, goToNext, onClose]);

  if (!currentStory) return null;

  const timeAgo = formatDistanceToNow(new Date(currentStory.createdAt), { addSuffix: true });

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-10 text-white hover:bg-white/20"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </Button>

      {/* Progress bars */}
      <div className="absolute top-4 left-4 right-16 flex gap-1 z-10">
        {stories.map((_, index) => (
          <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-100"
              style={{
                width:
                  index < currentIndex
                    ? '100%'
                    : index === currentIndex
                    ? `${progress}%`
                    : '0%',
              }}
            />
          </div>
        ))}
      </div>

      {/* User info */}
      <div className="absolute top-10 left-4 flex items-center gap-3 z-10">
        <Avatar className="w-10 h-10 border-2 border-white">
          <AvatarImage src={currentStory.user.avatarUrl} />
          <AvatarFallback>
            {(currentStory.user.displayName || currentStory.user.name).charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-white font-semibold text-sm">
            {currentStory.user.displayName || currentStory.user.name}
          </p>
          <p className="text-white/70 text-xs">{timeAgo}</p>
        </div>
      </div>

      {/* View count */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 text-white/70 text-sm z-10">
        <Eye className="w-4 h-4" />
        {currentStory.viewCount} views
      </div>

      {/* Navigation areas */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1/3 cursor-pointer z-5"
        onClick={goToPrevious}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      />
      <div
        className="absolute right-0 top-0 bottom-0 w-1/3 cursor-pointer z-5"
        onClick={goToNext}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      />

      {/* Navigation arrows */}
      {currentIndex > 0 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
          onClick={goToPrevious}
        >
          <ChevronLeft className="w-8 h-8" />
        </Button>
      )}
      {currentIndex < stories.length - 1 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20"
          onClick={goToNext}
        >
          <ChevronRight className="w-8 h-8" />
        </Button>
      )}

      {/* Story content */}
      <div
        className="max-w-md w-full h-[80vh] max-h-[600px] rounded-lg overflow-hidden flex items-center justify-center"
        style={{ backgroundColor: currentStory.backgroundColor || '#1a1a1a' }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {currentStory.imageUrl ? (
          <img
            src={currentStory.imageUrl}
            alt="Story"
            className="w-full h-full object-contain"
          />
        ) : currentStory.text ? (
          <div className="p-8 text-center">
            <p className="text-white text-2xl font-medium leading-relaxed">
              {currentStory.text}
            </p>
          </div>
        ) : (
          <p className="text-white/50">No content</p>
        )}
      </div>
    </div>
  );
}
