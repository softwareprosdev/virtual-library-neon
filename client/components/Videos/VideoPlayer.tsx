'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw, Settings, SkipBack, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

// Dynamic import for ReactPlayer to avoid SSR issues
const ReactPlayer = dynamic(() => import('react-player'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-black flex items-center justify-center text-white">Loading player...</div>
});

interface VideoPlayerProps {
  video: {
    id: string;
    title: string;
    videoUrl: string;
    thumbnailUrl: string;
    duration: number;
    source: string;
    attribution?: {
      photographer: string;
      photographerUrl: string;
    };
  };
  isOpen: boolean;
  onClose: () => void;
  autoPlay?: boolean;
}

// Helper function to detect if video is from external platform
const isExternalVideo = (url: string) => {
  return url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com');
};

export default function VideoPlayer({ video, isOpen, onClose, autoPlay = false }: VideoPlayerProps) {
  // Player State
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showControls, setShowControls] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number>(0);
  const touchStartTime = useRef<number>(0);

  // Hide controls after inactivity
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying]);

  // Initialize player
  useEffect(() => {
    if (isOpen && videoRef.current) {
      setIsLoading(true);
      setHasError(false);
      setErrorMessage('');
      setCurrentTime(0);
      setIsPlaying(autoPlay);

      // Load video
      videoRef.current.load();
      resetControlsTimeout();
    }
  }, [isOpen, video, autoPlay, resetControlsTimeout]);

  const togglePlay = () => {
    if (!videoRef.current || hasError) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {
        setHasError(true);
        setErrorMessage('Unable to play video. Please check your connection.');
      });
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;

    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      const element = containerRef.current;
      if (element.requestFullscreen) {
        element.requestFullscreen();
      } else if ((element as any).webkitRequestFullscreen) {
        (element as any).webkitRequestFullscreen();
      } else if ((element as any).mozRequestFullScreen) {
        (element as any).mozRequestFullScreen();
      } else if ((element as any).msRequestFullscreen) {
        (element as any).msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }
  };

  const seekTo = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(time, duration));
    }
  };

  const skipForward = () => {
    if (videoRef.current) {
      seekTo(videoRef.current.currentTime + 10);
    }
  };

  const skipBackward = () => {
    if (videoRef.current) {
      seekTo(videoRef.current.currentTime - 10);
    }
  };

  const adjustVolume = (delta: number) => {
    if (!videoRef.current) return;

    const newVolume = Math.max(0, Math.min(1, volume + delta));
    setVolume(newVolume);
    videoRef.current.volume = newVolume;
    setIsMuted(newVolume === 0);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      // Don't trigger if user is typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
        case 'F11':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipBackward();
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipForward();
          break;
        case 'ArrowUp':
          e.preventDefault();
          adjustVolume(0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          adjustVolume(-0.1);
          break;
        case '0':
        case 'Home':
          e.preventDefault();
          seekTo(0);
          break;
        case 'Escape':
          if (isFullscreen) {
            toggleFullscreen();
          } else {
            onClose();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFullscreen]);

  // Mouse movement controls visibility
  useEffect(() => {
    const handleMouseMove = () => {
      resetControlsTimeout();
    };

    const handleMouseLeave = () => {
      if (isPlaying && !isFullscreen) {
        setShowControls(false);
      }
    };

    if (containerRef.current) {
      containerRef.current.addEventListener('mousemove', handleMouseMove);
      containerRef.current.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('mousemove', handleMouseMove);
        containerRef.current.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [resetControlsTimeout, isPlaying, isFullscreen]);

  // Fullscreen change handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Touch gesture support for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartTime.current = currentTime;
  }, [currentTime]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!duration) return;

    const touchX = e.touches[0].clientX;
    const deltaX = touchX - touchStartX.current;
    const seekAmount = (deltaX / window.innerWidth) * duration * 0.5; // 50% of screen width = full video duration
    const newTime = Math.max(0, Math.min(duration, touchStartTime.current + seekAmount));

    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  }, [duration]);

  // Double tap for fullscreen on mobile
  const handleDoubleClick = useCallback(() => {
    if (window.innerWidth <= 768) { // Mobile breakpoint
      toggleFullscreen();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Video event handlers
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);
      if (autoPlay) {
        videoRef.current.play().catch(() => {
          setIsPlaying(false);
        });
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
    resetControlsTimeout();
  };

  const handlePause = () => {
    setIsPlaying(false);
    setShowControls(true);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setShowControls(true);
  };

  const handleWaiting = () => {
    setIsBuffering(true);
  };

  const handleCanPlay = () => {
    setIsBuffering(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
    setIsBuffering(false);
    setErrorMessage('Failed to load video. Please try again.');
  };

  

  const handleSeek = (value: number[]) => {
    const newTime = (value[0] / 100) * duration;
    seekTo(newTime);
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0] / 100;
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    setIsMuted(newVolume === 0);
  };

  const changePlaybackSpeed = () => {
    const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    const newSpeed = speeds[nextIndex];

    setPlaybackSpeed(newSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = newSpeed;
    }
  };

  const formatTime = (time: number) => {
    if (!isFinite(time)) return '0:00';

    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleRetry = () => {
    setHasError(false);
    setErrorMessage('');
    setIsLoading(true);
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
      <div
        ref={containerRef}
        className={cn(
          "relative bg-black overflow-hidden transition-all duration-300",
          isFullscreen
            ? "w-screen h-screen"
            : "w-full max-w-6xl mx-4 max-h-[90vh] rounded-lg"
        )}
        onMouseMove={resetControlsTimeout}
        onMouseLeave={() => isPlaying && !isFullscreen && setShowControls(false)}
      >
        {/* Close Button */}
        {!isFullscreen && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 z-20 text-white hover:bg-white/20 rounded-full w-10 h-10 p-0"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        )}

        {/* Video Container */}
        <div className="relative group">
          {isExternalVideo(video.videoUrl) ? (
            <ReactPlayer
              ref={videoRef}
              src={video.videoUrl}
              playing={isPlaying}
              volume={isMuted ? 0 : volume}
              playbackRate={playbackSpeed}
              width="100%"
              height="100%"
              controls={false}
              muted={isMuted}
              playsInline
              onReady={() => setIsLoading(false)}
              onStart={() => setIsPlaying(true)}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              onError={(error) => {
                setHasError(true);
                setErrorMessage('Failed to load external video');
                console.error('ReactPlayer error:', error);
              }}
              onProgress={(progress: any) => {
                setCurrentTime(progress.playedSeconds);
                if (progress.loaded < 1) setIsBuffering(true);
                else setIsBuffering(false);
              }}
              onDurationChange={(duration: any) => setDuration(duration)}
              config={{
                youtube: {
                  playerVars: {
                    modestbranding: 1,
                    rel: 0,
                    showinfo: 0
                  }
                },
                vimeo: {
                  playerOptions: {
                    title: false,
                    portrait: false
                  }
                }
              } as any}
            />
          ) : (
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              poster={video.thumbnailUrl}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onPlay={handlePlay}
              onPause={handlePause}
              onEnded={handleEnded}
              onWaiting={handleWaiting}
              onCanPlay={handleCanPlay}
              onError={handleError}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onDoubleClick={handleDoubleClick}
              preload="metadata"
              playsInline
            >
              <source src={video.videoUrl} type="video/mp4" />
              <source src={video.videoUrl} type="video/webm" />
              <source src={video.videoUrl} type="video/ogg" />
              Your browser does not support the video tag.
            </video>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/75">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
                <p className="text-white text-lg">Loading video...</p>
              </div>
            </div>
          )}

          {/* Buffering Indicator */}
          {isBuffering && !isLoading && (
            <div className="absolute top-4 left-4 bg-black/75 text-white px-3 py-1 rounded-full text-sm">
              Buffering...
            </div>
          )}

          {/* Error State */}
          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90">
              <div className="text-center max-w-md px-6">
                <div className="text-red-400 text-6xl mb-4">⚠️</div>
                <h3 className="text-white text-xl font-semibold mb-2">Video Playback Error</h3>
                <p className="text-gray-300 mb-6">{errorMessage}</p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={handleRetry} variant="outline" className="text-white border-white hover:bg-white hover:text-black">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                  <Button onClick={onClose} variant="secondary">
                    Close Player
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Play/Pause Overlay */}
          {!isPlaying && !isLoading && !hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <Button
                size="lg"
                className="bg-white/90 hover:bg-white text-black border-0 rounded-full w-20 h-20 p-0 shadow-2xl"
                onClick={togglePlay}
              >
                <Play className="h-8 w-8 ml-1" />
              </Button>
            </div>
          )}

          {/* Click to Play/Pause */}
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={togglePlay}
            onDoubleClick={toggleFullscreen}
          />

          {/* Controls */}
          {showControls && !hasError && (
            <div className={cn(
              "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 transition-opacity duration-300",
              !showControls && "opacity-0"
            )}>
              {/* Progress Bar */}
              <div className="mb-4">
                <Slider
                  value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
                  onValueChange={handleSeek}
                  max={100}
                  step={0.1}
                  className="w-full cursor-pointer"
                />
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-4">
                  {/* Play/Pause */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20 rounded-full p-2 md:p-3"
                    onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  >
                    {isPlaying ? <Pause className="h-5 w-5 md:h-6 md:w-6" /> : <Play className="h-5 w-5 md:h-6 md:w-6" />}
                  </Button>

                  {/* Skip Backward */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20 rounded-full p-2 md:p-3 hidden md:flex"
                    onClick={(e) => { e.stopPropagation(); skipBackward(); }}
                  >
                    <SkipBack className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>

                  {/* Skip Forward */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20 rounded-full p-2 md:p-3 hidden md:flex"
                    onClick={(e) => { e.stopPropagation(); skipForward(); }}
                  >
                    <SkipForward className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>

                  {/* Volume */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20 rounded-full p-2 md:p-3"
                      onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                    >
                      {isMuted || volume === 0 ? <VolumeX className="h-4 w-4 md:h-5 md:w-5" /> : <Volume2 className="h-4 w-4 md:h-5 md:w-5" />}
                    </Button>
                    <div className="hidden md:block w-20">
                      <Slider
                        value={[isMuted ? 0 : volume * 100]}
                        onValueChange={handleVolumeChange}
                        max={100}
                        step={1}
                        className="cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Time */}
                  <div className="text-white text-sm md:text-base font-mono">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Speed Control */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20 rounded px-2 md:px-3 text-xs md:text-sm hidden md:flex"
                    onClick={(e) => { e.stopPropagation(); changePlaybackSpeed(); }}
                  >
                    {playbackSpeed}x
                  </Button>

                  {/* Fullscreen */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20 rounded-full p-2 md:p-3"
                    onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                  >
                    {isFullscreen ? <Minimize className="h-4 w-4 md:h-5 md:w-5" /> : <Maximize className="h-4 w-4 md:h-5 md:w-5" />}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Video Info */}
        {!isFullscreen && (
          <div className="p-4 bg-gray-900 border-t border-gray-800">
            <h2 className="text-white text-lg font-semibold mb-2 line-clamp-2">{video.title}</h2>

            {/* Attribution */}
            {video.source === 'pexels' && video.attribution && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400">Video by</span>
                <a
                  href={video.attribution.photographerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline font-medium"
                >
                  {video.attribution.photographer}
                </a>
                <span className="text-gray-400">on Pexels</span>
              </div>
            )}

            {/* Mobile Controls Hint */}
            <div className="mt-3 text-xs text-gray-500 md:hidden">
              Tap to play/pause • Double tap for fullscreen
            </div>

            {/* Desktop Controls Hint */}
            <div className="mt-3 text-xs text-gray-500 hidden md:block">
              Space/K: Play/Pause • F: Fullscreen • M: Mute • ←→: Skip • ↑↓: Volume • Esc: Close
            </div>

            {/* Mobile Controls Hint */}
            <div className="mt-3 text-xs text-gray-500 md:hidden">
              Tap: Play/Pause • Pinch: Zoom • Swipe: Seek • Double tap: Fullscreen
            </div>
          </div>
        )}
      </div>
    </div>
  );
}