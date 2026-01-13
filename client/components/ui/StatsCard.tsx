'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  trend?: string;
  iconColor?: string;
  iconBgColor?: string;
  delay?: number;
}

export function StatsCard({
  icon: Icon,
  label,
  value,
  trend,
  iconColor = 'text-primary',
  iconBgColor = 'bg-primary/10',
  delay = 0,
}: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{label}</p>
          <motion.p
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: delay + 0.2 }}
            className="text-3xl font-bold"
          >
            {value}
          </motion.p>
          {trend && (
            <p className={cn('text-xs mt-1', iconColor)}>{trend}</p>
          )}
        </div>
        <div
          className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center',
            iconBgColor
          )}
        >
          <Icon className={cn('w-6 h-6', iconColor)} />
        </div>
      </div>
    </motion.div>
  );
}
