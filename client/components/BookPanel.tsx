'use client';

import Image from 'next/image';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { BookOpen, ExternalLink } from 'lucide-react';
import { useState } from 'react';

interface Book {
  id: string;
  title: string;
  author?: string;
  coverUrl?: string;
  description?: string;
  isbn?: string;
  fileUrl?: string;
  googleId?: string;
}

interface BookPanelProps {
  book: Book;
  onReadBook?: (book: Book) => void;
}

export default function BookPanel({ book, onReadBook }: BookPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleReadBook = () => {
    if (onReadBook) {
      onReadBook(book);
    } else {
      // Fallback: open in new tab
      const bookUrl = book.fileUrl || `https://books.google.com/books?id=${book.googleId}`;
      window.open(bookUrl, '_blank');
    }
  };

  return (
    <Card className="flex flex-col mb-4 overflow-hidden">
      <div className="flex gap-4 p-4">
        {book.coverUrl && (
          <div className="w-20 h-28 sm:w-24 sm:h-32 bg-black/20 rounded flex-shrink-0 relative overflow-hidden">
            <Image
              src={book.coverUrl.replace('http:', 'https:')}
              alt={book.title}
              fill
              className="object-contain p-1"
              sizes="96px"
            />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg sm:text-xl font-bold text-primary truncate">
            {book.title}
          </h3>
          <p className="text-muted-foreground font-medium text-sm truncate">
            {book.author || 'Unknown Author'}
          </p>
          {book.isbn && (
             <Badge variant="outline" className="mt-2 text-xs">
               ISBN: {book.isbn}
             </Badge>
          )}
          {book.description && (
             <p className={`mt-2 text-xs text-muted-foreground ${isExpanded ? '' : 'line-clamp-2'}`}>
                {book.description}
             </p>
          )}
          {book.description && book.description.length > 100 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-primary hover:underline mt-1"
            >
              {isExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
          <div className="mt-3 pt-2 border-t border-border/50">
            <Button 
              size="sm" 
              onClick={handleReadBook}
              className="w-full sm:w-auto"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Read Book
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
