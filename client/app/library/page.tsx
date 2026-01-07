"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getToken } from '../../lib/auth';
import MainLayout from '../../components/MainLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardFooter } from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Search, Plus, Trash2, BookOpen, Loader2, Book as BookIcon } from 'lucide-react';

interface Book {
  id: string;
  title: string;
  author: string;
  fileUrl: string;
  coverUrl?: string;
  category?: string;
}

export default function LibraryPage() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const fetchBooks = useCallback(async (query = '') => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) {
        router.push('/login');
        return;
      }

      const url = query 
        ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/books/search?q=${encodeURIComponent(query)}`
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/books`;

      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setBooks(data);
      }
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBooks(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search, fetchBooks]);

  const handleUpload = async () => {
    if (!file || !title || !author) return;
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('author', author);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/books/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        },
        body: formData
      });

      if (res.ok) {
        setOpen(false);
        setFile(null);
        setTitle('');
        setAuthor('');
        fetchBooks();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRead = (book: Book) => {
    if (!book.fileUrl) return;
    
    if (book.fileUrl.startsWith('http')) {
      window.open(book.fileUrl, '_blank');
    } else {
      // Local upload
      const baseUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
      window.open(`${baseUrl}${book.fileUrl}`, '_blank');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this book?')) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/books/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        }
      });

      if (res.ok) {
        setBooks(books.filter(book => book.id !== id));
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-72">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by title or author..."
                    className="pl-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Upload Book
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Upload New Book</DialogTitle>
                        <DialogDescription>
                            Add a new book to your library. Supported formats: PDF.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <label htmlFor="title" className="text-sm font-medium">Title</label>
                            <Input 
                                id="title" 
                                value={title} 
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter book title"
                            />
                        </div>
                        <div className="grid gap-2">
                            <label htmlFor="author" className="text-sm font-medium">Author</label>
                            <Input 
                                id="author" 
                                value={author} 
                                onChange={(e) => setAuthor(e.target.value)}
                                placeholder="Enter author name"
                            />
                        </div>
                         <div className="grid gap-2">
                            <label htmlFor="file" className="text-sm font-medium">Book File (PDF)</label>
                            <Input 
                                id="file" 
                                type="file" 
                                accept=".pdf"
                                onChange={(e) => setFile(e.target.files?.[0] || null)} 
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button onClick={handleUpload} disabled={isUploading || !file || !title || !author}>
                            {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Upload
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>

        {loading && books.length === 0 ? (
             <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        ) : (
            <>
                {books.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <BookIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>No books found. Upload one to get started!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                        {books.map((book) => (
                            <Card key={book.id} className="flex flex-col h-full hover:shadow-md transition-all hover:border-primary/50 group overflow-hidden">
                                <div className="aspect-[2/3] w-full bg-secondary/30 relative overflow-hidden">
                                    {book.coverUrl ? (
                                        <Image src={book.coverUrl} alt={book.title} fill className="object-cover" sizes="(max-width: 640px) 50vw, 200px" />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center w-full h-full text-muted-foreground p-4 text-center">
                                            <BookOpen className="h-8 w-8 sm:h-12 sm:w-12 mb-2 opacity-50" />
                                        </div>
                                    )}
                                     <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4">
                                        <Button 
                                            size="sm" 
                                            className="w-full" 
                                            onClick={() => handleRead(book)}
                                        >
                                            Read
                                        </Button>
                                     </div>
                                </div>
                                <CardContent className="p-3 sm:p-4 flex-1">
                                    <h3 className="font-semibold text-sm sm:text-base truncate" title={book.title}>{book.title}</h3>
                                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{book.author}</p>
                                </CardContent>
                                <CardFooter className="p-3 sm:p-4 pt-0 flex justify-end">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors" 
                                        onClick={() => handleDelete(book.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </>
        )}
      </div>
    </MainLayout>
  );
}
