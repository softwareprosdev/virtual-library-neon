'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ImageIcon } from 'lucide-react';

interface BookImageProps {
  src?: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
}

export default function BookImage({ 
  src, 
  alt, 
  width = 128, 
  height = 192, 
  className = '',
  sizes = '128px',
  priority = false 
}: BookImageProps) {
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Handle null/undefined src
  if (!src) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-200 rounded ${className}`}
        style={{ width, height }}
      >
        <ImageIcon className="w-8 h-8 text-gray-400" />
      </div>
    );
  }

  // Handle image error
  if (error) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-200 rounded ${className}`}
        style={{ width, height }}
      >
        <ImageIcon className="w-8 h-8 text-gray-400" />
      </div>
    );
  }

  // Normalize URL - ensure HTTPS for better security
  const normalizedSrc = src.replace(/^http:/, 'https:');

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}
      <Image
        src={normalizedSrc}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        priority={priority}
        className="object-cover rounded"
        onError={() => {
          setError(true);
          setIsLoading(false);
        }}
        onLoad={() => {
          setIsLoading(false);
        }}
        unoptimized={false}
      />
    </div>
  );
}