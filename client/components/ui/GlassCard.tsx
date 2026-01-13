'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: ReactNode;
  variant?: 'default' | 'intense' | 'subtle' | 'neon';
  hover?: boolean;
  glow?: boolean;
  className?: string;
  onClick?: () => void;
}

export function GlassCard({
  children,
  variant = 'default',
  hover = true,
  glow = false,
  className,
  onClick,
}: GlassCardProps) {
  const variantClasses = {
    default: 'glass-card',
    intense: 'glass-intense',
    subtle: 'glass-subtle',
    neon: 'glass-neon',
  };

  const glowClasses = glow ? 'glow-primary' : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        variantClasses[variant],
        glowClasses,
        hover && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      whileHover={hover ? { y: -4, scale: 1.01 } : undefined}
      whileTap={hover ? { scale: 0.98 } : undefined}
    >
      {children}
    </motion.div>
  );
}
