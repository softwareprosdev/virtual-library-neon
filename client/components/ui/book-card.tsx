'use client';

import { useState } from 'react';
import BookImage from '../ui/book-image';
import { GoogleBook } from '../../lib/google-books';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Star, 
  Clock, 
  BookOpen, 
  Eye, 
  Heart,
  Bookmark,
  ExternalLink
} from 'lucide-react';

interface BookCardProps {
  book: GoogleBook;
  variant?: 'default' | 'compact' | 'featured';
  onClick?: () => void;
  showAddButton?: boolean;
}

export default function BookCard({ 
  book, 
  variant = 'default', 
  onClick,
  showAddButton = false 
}: BookCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  
  const {
    id,
    volumeInfo: {
      title,
      authors,
      description,
      imageLinks,
      averageRating,
      ratingsCount,
      pageCount,
      publishedDate,
      categories,
      previewLink,
      infoLink
    }
  } = book;

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
  };

  const handleViewDetails = () => {
    if (onClick) onClick();
  };

  const getYear = () => {
    return publishedDate ? new Date(publishedDate).getFullYear() : null;
  };

  const getMainCategory = () => {
    return categories?.[0]?.split(' / ')[0] || 'General';
  };

  if (variant === 'compact') {
    return (
      <div 
        className="group relative flex gap-3 p-3 rounded-lg border border-gray-200 bg-white hover:border-blue-300 hover:shadow-lg transition-all duration-300 cursor-pointer"
        onClick={handleViewDetails}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <BookImage 
          src={imageLinks?.thumbnail}
          alt={title}
          width={60}
          height={90}
          className="rounded shadow-md flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 mb-1">
            {title}
          </h3>
          <p className="text-xs text-gray-600 line-clamp-1">
            {authors?.[0] || 'Unknown Author'}
          </p>
          {averageRating && (
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-medium">{averageRating.toFixed(1)}</span>
              {ratingsCount && (
                <span className="text-xs text-gray-500">({ratingsCount})</span>
              )}
            </div>
          )}
        </div>
        {showAddButton && (
          <Button 
            size="icon" 
            variant="ghost" 
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <Bookmark className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  }

  if (variant === 'featured') {
    return (
      <div 
        className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6 cursor-pointer transform transition-all duration-500 hover:scale-105 hover:shadow-2xl"
        onClick={handleViewDetails}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Background gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-60" />
        
        <div className="relative z-10">
          <div className="flex gap-4 mb-4">
            <BookImage 
              src={imageLinks?.thumbnail}
              alt={title}
              width={120}
              height={180}
              className="rounded-lg shadow-2xl border-2 border-white/20"
            />
            <div className="flex-1">
              <Badge className="mb-2 bg-blue-600 text-white">
                {getMainCategory()}
              </Badge>
              <h2 className="text-xl font-bold text-white mb-2 line-clamp-2 group-hover:text-blue-300 transition-colors">
                {title}
              </h2>
              <p className="text-sm text-gray-300 line-clamp-2 mb-3">
                {description}
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                {averageRating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{averageRating.toFixed(1)}</span>
                  </div>
                )}
                {pageCount && (
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    <span>{pageCount} pages</span>
                  </div>
                )}
                {getYear() && (
                  <span>{getYear()}</span>
                )}
              </div>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex gap-2">
            {previewLink && (
              <Button size="sm" variant="outline" className="text-white border-white/30 hover:bg-white hover:text-black">
                <Eye className="w-4 h-4 mr-1" />
                Preview
              </Button>
            )}
            <Button 
              size="sm" 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleLike}
            >
              <Heart className={`w-4 h-4 mr-1 ${isLiked ? 'fill-current' : ''}`} />
              {isLiked ? 'Liked' : 'Like'}
            </Button>
          </div>
        </div>
        
        {/* Floating decoration */}
        {isHovered && (
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full animate-pulse" />
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div 
      className="group relative bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:border-blue-200 hover:-translate-y-1"
      onClick={handleViewDetails}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Book cover with reflection effect */}
      <div className="relative h-48 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
        <BookImage 
          src={imageLinks?.thumbnail}
          alt={title}
          width={128}
          height={192}
          className="object-cover transition-transform duration-300 group-hover:scale-110"
        />
        
        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Action badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {averageRating && (
            <div className="bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1 shadow-md">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-bold">{averageRating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Book information */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 text-sm mb-1">
              {title}
            </h3>
            <p className="text-xs text-gray-600 font-medium">
              {authors?.[0] || 'Unknown Author'}
            </p>
          </div>
          {showAddButton && (
            <Button 
              size="icon" 
              variant="ghost" 
              className="opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-blue-50"
              onClick={(e) => e.stopPropagation()}
            >
              <Bookmark className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
            </Button>
          )}
        </div>
        
        {/* Book metadata */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {categories?.[0] && (
            <Badge variant="secondary" className="text-xs">
              {categories[0].split(' / ')[0]}
            </Badge>
          )}
          {pageCount && (
            <div className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" />
              <span>{pageCount}p</span>
            </div>
          )}
          {getYear() && (
            <span>{getYear()}</span>
          )}
          {ratingsCount && (
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span>{ratingsCount} reviews</span>
            </div>
          )}
        </div>
        
        {/* Description preview */}
        {description && (
          <p className="text-xs text-gray-600 line-clamp-2 mt-2 group-hover:text-gray-800 transition-colors">
            {description}
          </p>
        )}
        
        {/* Action buttons on hover */}
        <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
          {previewLink && (
            <Button 
              size="sm" 
              variant="outline" 
              className="text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <Eye className="w-3 h-3 mr-1" />
              Preview
            </Button>
          )}
          {infoLink && (
            <Button 
              size="sm" 
              variant="ghost"
              className="text-xs"
              onClick={(e) => {
                e.stopPropagation();
                window.open(infoLink, '_blank');
              }}
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Details
            </Button>
          )}
        </div>
      </div>
      
      {/* Hover indicator */}
      {isHovered && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse" />
      )}
    </div>
  );
}