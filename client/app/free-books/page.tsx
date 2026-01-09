'use client';

import { useState, useEffect, useCallback } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  BookOpen,
  Download,
  ExternalLink,
  Loader2,
  TrendingUp,
  Library as LibraryIcon,
  Globe
} from 'lucide-react';
import { api } from '@/lib/api';
import Image from 'next/image';

interface GutenbergBook {
  id: string;
  title: string;
  authors: string[];
  subjects?: string[];
  formats: Record<string, string>;
  downloadCount?: number;
  coverImage: string | null;
  source: 'gutenberg';
}

interface OpenLibraryBook {
  id: string;
  title: string;
  authors: string[];
  publishYear?: number;
  coverImage: string | null;
  openLibraryId: string;
  hasFulltext?: boolean;
  ia?: string[];
  source: 'openlibrary';
}

type Book = GutenbergBook | OpenLibraryBook;

export default function FreeBooksPage() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'popular' | 'gutenberg' | 'openlibrary'>('popular');
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);

  // Fetch popular books
  const fetchPopular = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api('/free-books/popular');
      const data = await response.json();
      setBooks(data.books || []);
      setHasMore(false); // Popular doesn't have pagination
    } catch (error) {
      console.error('Failed to fetch popular books:', error);
      setBooks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch from Gutenberg
  const fetchGutenberg = useCallback(async (query: string, pageNum = 1) => {
    const loading = pageNum === 1 ? setIsLoading : setLoadingMore;
    loading(true);

    try {
      const searchParam = query ? `&search=${encodeURIComponent(query)}` : '';
      const response = await api(`/free-books/gutenberg?page=${pageNum}${searchParam}`);
      const data = await response.json();

      if (pageNum === 1) {
        setBooks(data.books || []);
      } else {
        setBooks(prev => [...prev, ...(data.books || [])]);
      }

      setHasMore(!!data.next);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch Gutenberg books:', error);
      if (pageNum === 1) setBooks([]);
    } finally {
      loading(false);
    }
  }, []);

  // Fetch from Open Library
  const fetchOpenLibrary = useCallback(async (query: string, pageNum = 1) => {
    if (!query.trim()) {
      setBooks([]);
      return;
    }

    const loading = pageNum === 1 ? setIsLoading : setLoadingMore;
    loading(true);

    try {
      const response = await api(`/free-books/openlibrary?search=${encodeURIComponent(query)}&page=${pageNum}`);
      const data = await response.json();

      if (pageNum === 1) {
        setBooks(data.books || []);
      } else {
        setBooks(prev => [...prev, ...(data.books || [])]);
      }

      const totalPages = Math.ceil((data.totalFound || 0) / 20);
      setHasMore(pageNum < totalPages);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch Open Library books:', error);
      if (pageNum === 1) setBooks([]);
    } finally {
      loading(false);
    }
  }, []);

  // Handle search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'popular') {
        fetchPopular();
      } else if (activeTab === 'gutenberg') {
        fetchGutenberg(search);
      } else if (activeTab === 'openlibrary') {
        fetchOpenLibrary(search);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [search, activeTab, fetchPopular, fetchGutenberg, fetchOpenLibrary]);

  // Load more
  const loadMore = () => {
    if (!loadingMore && hasMore) {
      if (activeTab === 'gutenberg') {
        fetchGutenberg(search, page + 1);
      } else if (activeTab === 'openlibrary') {
        fetchOpenLibrary(search, page + 1);
      }
    }
  };

  // Infinite scroll
  useEffect(() => {
    if (!hasMore || loadingMore) return;

    const handleScroll = () => {
      const { innerHeight, scrollY } = window;
      const { scrollHeight } = document.body;

      if (scrollY + innerHeight >= scrollHeight - 1000) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore, activeTab, search, page]);

  // Get EPUB link
  const getEpubLink = (book: Book): string | null => {
    if (book.source === 'gutenberg') {
      return book.formats['application/epub+zip'] ||
             book.formats['application/epub'] || null;
    }
    return null;
  };

  // Open in reader
  const openReader = (book: Book) => {
    const epubUrl = getEpubLink(book);
    if (epubUrl) {
      const readerUrl = `/reader?url=${encodeURIComponent(epubUrl)}&title=${encodeURIComponent(book.title)}`;
      window.open(readerUrl, '_blank');
    }
  };

  const isGutenberg = (book: Book): book is GutenbergBook => book.source === 'gutenberg';

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-black mb-2 flex items-center gap-3">
            <LibraryIcon className="h-8 w-8 text-primary" />
            FREE_BOOKS
          </h1>
          <p className="text-muted-foreground">
            Browse 70,000+ free books from Project Gutenberg and millions from Open Library
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            className="pl-10 py-6 text-lg bg-card/50 backdrop-blur"
            placeholder="Search free books by title, author, or subject..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="popular">
              <TrendingUp className="h-4 w-4 mr-2" />
              Popular
            </TabsTrigger>
            <TabsTrigger value="gutenberg">
              <BookOpen className="h-4 w-4 mr-2" />
              Gutenberg
            </TabsTrigger>
            <TabsTrigger value="openlibrary">
              <Globe className="h-4 w-4 mr-2" />
              Open Library
            </TabsTrigger>
          </TabsList>

          {/* Content */}
          <div className="mt-6">
            {isLoading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : books.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>
                  {search
                    ? `No results found for "${search}"`
                    : activeTab === 'openlibrary'
                    ? 'Enter a search term to browse Open Library'
                    : 'No books found'}
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-4">
                  {books.map((book) => (
                    <Card key={book.id} className="p-6 hover:border-primary transition-all bg-card/50">
                      <div className="flex gap-4">
                        {/* Cover Image */}
                        <div className="flex-shrink-0">
                          {book.coverImage ? (
                            <Image
                              src={book.coverImage}
                              alt={book.title}
                              width={96}
                              height={144}
                              className="object-cover rounded border border-border"
                            />
                          ) : (
                            <div className="w-24 h-36 bg-secondary/20 rounded border border-border flex items-center justify-center">
                              <BookOpen className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Book Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg mb-1">{book.title}</h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            by {book.authors.join(', ')}
                          </p>

                          {isGutenberg(book) && book.downloadCount && (
                            <p className="text-xs text-muted-foreground mb-2">
                              📥 {book.downloadCount.toLocaleString()} downloads
                            </p>
                          )}

                          {isGutenberg(book) && book.subjects && book.subjects.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {book.subjects.slice(0, 3).map((subject, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs px-2 py-1 bg-secondary/20 rounded"
                                >
                                  {subject}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex flex-wrap gap-2 mt-3">
                            {getEpubLink(book) && (
                              <Button
                                onClick={() => openReader(book)}
                                size="sm"
                                className="gap-2"
                              >
                                <BookOpen className="h-4 w-4" />
                                Read Now
                              </Button>
                            )}

                            {isGutenberg(book) && (
                              <>
                                {book.formats['text/html'] && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(book.formats['text/html'], '_blank')}
                                    className="gap-2"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                    Read Online
                                  </Button>
                                )}

                                {(book.formats['application/epub+zip'] ||
                                  book.formats['application/pdf']) && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const downloadUrl = book.formats['application/epub+zip'] ||
                                                        book.formats['application/pdf'];
                                      window.open(downloadUrl, '_blank');
                                    }}
                                    className="gap-2"
                                  >
                                    <Download className="h-4 w-4" />
                                    Download
                                  </Button>
                                )}
                              </>
                            )}

                            {/* Open Library Actions */}
                            {!isGutenberg(book) && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const olBook = book as OpenLibraryBook;
                                    // Open Library book page
                                    window.open(`https://openlibrary.org${olBook.openLibraryId}`, '_blank');
                                  }}
                                  className="gap-2"
                                >
                                  <BookOpen className="h-4 w-4" />
                                  View on Open Library
                                </Button>

                                {(book as OpenLibraryBook).hasFulltext && (book as OpenLibraryBook).ia && (book as OpenLibraryBook).ia!.length > 0 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const olBook = book as OpenLibraryBook;
                                      // Internet Archive reader
                                      window.open(`https://archive.org/details/${olBook.ia![0]}`, '_blank');
                                    }}
                                    className="gap-2"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                    Read on Archive.org
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Infinite Scroll Loading Indicator */}
                {loadingMore && (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
              </>
            )}
          </div>
        </Tabs>
      </div>
    </MainLayout>
  );
}
