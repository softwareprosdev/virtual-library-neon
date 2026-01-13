import React from 'react';

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
  showPercentage?: boolean;
  children?: React.ReactNode;
}

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  className = '',
  showPercentage = true,
  children,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted opacity-20"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#gradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children || (showPercentage && (
          <span className="text-2xl font-bold gradient-text">
            {Math.round(progress)}%
          </span>
        ))}
      </div>
    </div>
  );
}

interface BookProgressProps {
  currentPage: number;
  totalPages: number;
  coverUrl?: string;
  title: string;
  size?: number;
}

export function BookProgress({
  currentPage,
  totalPages,
  coverUrl,
  title,
  size = 120,
}: BookProgressProps) {
  const progress = (currentPage / totalPages) * 100;

  return (
    <ProgressRing progress={progress} size={size} showPercentage={false}>
      <div className="flex flex-col items-center">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title}
            className="w-16 h-20 object-cover rounded shadow-lg"
          />
        ) : (
          <div className="w-16 h-20 bg-muted rounded flex items-center justify-center">
            <span className="text-xs text-muted-foreground text-center px-2">
              {title.slice(0, 20)}
            </span>
          </div>
        )}
      </div>
    </ProgressRing>
  );
}
