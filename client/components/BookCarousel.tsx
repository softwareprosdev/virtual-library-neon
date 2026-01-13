'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BookCarouselProps {
  children: React.ReactNode;
  title: string;
  showViewAll?: boolean;
  onViewAll?: () => void;
}

export function BookCarousel({
  children,
  title,
  showViewAll = true,
  onViewAll,
}: BookCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      const newScrollPosition =
        scrollContainerRef.current.scrollLeft +
        (direction === 'left' ? -scrollAmount : scrollAmount);
      
      scrollContainerRef.current.scrollTo({
        left: newScrollPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
        {showViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-primary hover:text-accent transition-colors flex items-center gap-1"
          >
            View All <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="relative group">
        {/* Left scroll button */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 glass-card p-2 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Scrollable container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth pb-4"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {children}
        </div>

        {/* Right scroll button */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 glass-card p-2 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Gradient fades */}
        <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent pointer-events-none" />
      </div>
    </div>
  );
}

interface BookCarouselItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function BookCarouselItem({
  children,
  onClick,
  className,
}: BookCarouselItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      className={cn(
        'snap-start flex-shrink-0 cursor-pointer transition-all',
        className
      )}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
