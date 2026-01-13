'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface StoryCircleProps {
  imageUrl?: string;
  label: string;
  unread?: boolean;
  onClick?: () => void;
  size?: number;
}

export function StoryCircle({
  imageUrl,
  label,
  unread = false,
  onClick,
  size = 80,
}: StoryCircleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="flex flex-col items-center gap-2 cursor-pointer"
      onClick={onClick}
    >
      <div
        className={cn('story-circle', unread && 'unread')}
        style={{ width: size, height: size }}
      >
        <div
          className="story-circle-inner w-full h-full flex items-center justify-center"
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={label}
              width={size - 10}
              height={size - 10}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl font-bold">
              {label.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
      <span className="text-xs text-center max-w-[80px] truncate">
        {label}
      </span>
    </motion.div>
  );
}
