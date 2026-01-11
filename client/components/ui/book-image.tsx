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

// Check if URL is from an external book API (should be loaded unoptimized)
const isExternalBookImage = (url: string): boolean => {
  const externalDomains = [
    'books.google.com',
    'googleusercontent.com',
    'gstatic.com',
    'googleapis.com',
    'openlibrary.org',
    'gutenberg.org',
    'archive.org',
  ];
  return externalDomains.some(domain => url.includes(domain));
};

// Get higher quality Google Books image URL
const getHighQualityUrl = (url: string): string => {
  // Google Books: replace zoom=1 with zoom=2 or 3 for higher quality
  if (url.includes('books.google.com')) {
    return url
      .replace(/zoom=\d/, 'zoom=2')
      .replace(/&edge=curl/g, ''); // Remove curl effect for cleaner images
  }
  // Open Library: use larger size
  if (url.includes('covers.openlibrary.org')) {
    return url.replace(/-[SML]\./, '-L.');
  }
  return url;
};

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
  const [retryCount, setRetryCount] = useState(0);

  // Handle null/undefined src
  if (!src) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900 rounded ${className}`}
        style={{ width, height }}
      >
        <ImageIcon className="w-8 h-8 text-gray-500" />
      </div>
    );
  }

  // Handle image error after retries
  if (error && retryCount >= 2) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900 rounded ${className}`}
        style={{ width, height }}
      >
        <ImageIcon className="w-8 h-8 text-gray-500" />
      </div>
    );
  }

  // Normalize URL - ensure HTTPS for better security
  let normalizedSrc = src.replace(/^http:/, 'https:');

  // Try to get higher quality image
  normalizedSrc = getHighQualityUrl(normalizedSrc);

  // Check if this is an external image
  const shouldUseUnoptimized = isExternalBookImage(normalizedSrc);

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 rounded">
          <div className="w-5 h-5 border-2 border-gray-600 border-t-primary rounded-full animate-spin" />
        </div>
      )}
      <Image
        src={normalizedSrc}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        priority={priority}
        className={`object-cover rounded transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onError={() => {
          if (retryCount < 2) {
            // Retry with a cache-busting parameter
            setRetryCount(prev => prev + 1);
            setError(false);
          } else {
            setError(true);
            setIsLoading(false);
          }
        }}
        onLoad={() => {
          setIsLoading(false);
          setError(false);
        }}
        unoptimized={shouldUseUnoptimized}
        loading={priority ? undefined : 'lazy'}
      />
    </div>
  );
}