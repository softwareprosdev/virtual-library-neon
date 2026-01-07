'use client';

import Image from 'next/image';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';

interface Book {
  id: string;
  title: string;
  author?: string;
  coverUrl?: string;
  description?: string;
  isbn?: string;
}

interface BookPanelProps {
  book: Book;
}

export default function BookPanel({ book }: BookPanelProps) {
  return (
    <Card className="flex flex-col md:flex-row mb-4 overflow-hidden">
      {book.coverUrl && (
        <div className="w-full md:w-[120px] h-[200px] md:h-auto bg-black p-2 flex-shrink-0 relative">
          <Image
            src={book.coverUrl.replace('http:', 'https:')}
            alt={book.title}
            fill
            className="object-contain p-2"
            sizes="120px"
          />
        </div>
      )}
      <div className="flex flex-col flex-grow">
        <CardContent className="p-4">
          <h3 className="text-xl font-bold text-primary">
            {book.title}
          </h3>
          <p className="text-muted-foreground font-medium">
            {book.author || 'Unknown Author'}
          </p>
          {book.isbn && (
             <Badge variant="outline" className="mt-2">
               ISBN: {book.isbn}
             </Badge>
          )}
          {book.description && (
             <p className="mt-4 text-sm text-muted-foreground max-h-[100px] overflow-y-auto">
                {book.description}
             </p>
          )}
        </CardContent>
      </div>
    </Card>
  );
}
