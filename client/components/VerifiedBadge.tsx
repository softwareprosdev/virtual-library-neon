import React from 'react';
import { Check } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface VerifiedBadgeProps {
  reason?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
}

const sizeClasses = {
  sm: 'w-3.5 h-3.5',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

const iconSizes = {
  sm: 10,
  md: 12,
  lg: 14,
};

const reasonLabels: Record<string, string> = {
  author: 'Verified Author',
  influencer: 'Verified Influencer',
  notable: 'Verified Notable',
  contributor: 'Verified Contributor',
  verified: 'Verified Account',
};

export function VerifiedBadge({
  reason = 'verified',
  size = 'md',
  className = '',
  showTooltip = true,
}: VerifiedBadgeProps) {
  const badge = (
    <div
      className={`inline-flex items-center justify-center rounded-full bg-blue-500 text-white ${sizeClasses[size]} ${className}`}
      aria-label={reasonLabels[reason] || 'Verified'}
    >
      <Check size={iconSizes[size]} strokeWidth={3} />
    </div>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm font-medium">{reasonLabels[reason] || 'Verified Account'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Inline variant for use within text
export function VerifiedBadgeInline({
  reason = 'verified',
  className = '',
}: Pick<VerifiedBadgeProps, 'reason' | 'className'>) {
  return (
    <VerifiedBadge
      reason={reason}
      size="sm"
      className={`ml-1 inline-block align-middle ${className}`}
    />
  );
}
