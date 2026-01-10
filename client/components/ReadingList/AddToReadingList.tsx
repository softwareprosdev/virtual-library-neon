'use client';

import { useState } from 'react';
import BookImage from '../ui/book-image';
import { api } from '../../lib/api';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { GoogleBook } from '../../lib/google-books';
import { BookOpen, Check, Clock, Bookmark } from 'lucide-react';

interface AddToReadingListProps {
  book: GoogleBook;
  onUpdate?: () => void;
  variant?: 'icon' | 'full';
}

export default function AddToReadingList({ book, onUpdate, variant = 'icon' }: AddToReadingListProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('WANT_TO_READ');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    try {
      setLoading(true);
      await api('/reading-list/update', {
        method: 'POST',
        body: JSON.stringify({
          googleId: book.id,
          title: book.volumeInfo.title,
          author: book.volumeInfo.authors?.[0] || 'Unknown',
          coverUrl: book.volumeInfo.imageLinks?.thumbnail,
          status
        })
      });
      setOpen(false);
      if (onUpdate) onUpdate();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === 'icon' ? (
            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full bg-background/50 hover:bg-primary hover:text-primary-foreground" title="Track this book">
                <Bookmark className="h-4 w-4" />
            </Button>
        ) : (
            <Button variant="outline" className="w-full gap-2">
                <Bookmark className="h-4 w-4" />
                Track Reading
            </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Track &quot;{book.volumeInfo.title}&quot;</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
<div className="flex items-center gap-4">
            <BookImage 
              src={book.volumeInfo.imageLinks?.thumbnail}
              alt="Cover"
              width={64}
              height={96}
              sizes="64px"
              className="rounded shadow-md"
            />
            <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">Reading Status</label>
                <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                    <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="WANT_TO_READ">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-blue-400" />
                            Want to Read
                        </div>
                    </SelectItem>
                    <SelectItem value="READING">
                        <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-yellow-400" />
                            Currently Reading
                        </div>
                    </SelectItem>
                    <SelectItem value="FINISHED">
                        <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-400" />
                            Finished
                        </div>
                    </SelectItem>
                    <SelectItem value="ABANDONED">
                        <div className="flex items-center gap-2">
                            <span className="text-destructive text-lg leading-none">×</span>
                            Abandoned
                        </div>
                    </SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
            <Button onClick={handleUpdate} disabled={loading}>
                {loading ? 'Saving...' : 'Save Update'}
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
