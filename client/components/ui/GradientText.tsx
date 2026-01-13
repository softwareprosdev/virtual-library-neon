'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GradientTextProps {
  children: ReactNode;
  variant?: 'primary' | 'accent' | 'emerald' | 'purple-cyan';
  animated?: boolean;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
}

export function GradientText({
  children,
  variant = 'primary',
  animated = false,
  className,
  as: Component = 'span',
}: GradientTextProps) {
  const variantClasses = {
    primary: 'gradient-text',
    accent: 'gradient-text-accent',
    emerald: 'bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent',
    'purple-cyan': 'bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent',
  };

  const content = (
    <Component className={cn(variantClasses[variant], className)}>
      {children}
    </Component>
  );

  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="inline-block"
      >
        {content}
      </motion.div>
    );
  }

  return content;
}
