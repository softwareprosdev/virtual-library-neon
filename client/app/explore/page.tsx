'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  BookOpen,
  TrendingUp,
  Users,
  Loader2,
  ExternalLink,
  BookMarked,
  Sparkles,
  Globe,
  Library,
  ShoppingBag
} from 'lucide-react';
import { api } from '@/lib/api';
import { searchAmazonBooks, getTrendingAmazonBooks, AmazonBook } from '@/lib/amazon-books';
import { searchBooks as searchGoogleBooks, GoogleBook } from '@/lib/google-books';

interface Book {
  id: string;
  title: string;
  authors?: string[];
  author?: string;
  coverImage?: string;
  coverUrl?: string;
  description?: string;
  source: 'google' | 'gutenberg' | 'openlibrary' | 'amazon';
  formats?: Record<string, string>;
  previewLink?: string;
  infoLink?: string;
  downloadCount?: number;
  hasFulltext?: boolean;
  ia?: string[];
  // Amazon specific
  asin?: string;
  price?: number;
  currency?: string;
  url?: string;
  rating?: number;
  reviewCount?: number;
}

interface Room {
  id: string;
  name: string;
  description?: string;
  genre?: { name: string };
  _count?: { participants: number; messages: number };
}

const CATEGORIES = [
  { name: 'Fiction', emoji: '📚', query: 'fiction' },
  { name: 'Science Fiction', emoji: '🚀', query: 'science+fiction' },
  { name: 'Fantasy', emoji: '🧙', query: 'fantasy' },
  { name: 'Mystery', emoji: '🔍', query: 'mystery' },
  { name: 'Romance', emoji: '💕', query: 'romance' },
  { name: 'Horror', emoji: '👻', query: 'horror' },
  { name: 'Biography', emoji: '👤', query: 'biography' },
  { name: 'History', emoji: '🏛️', query: 'history' },
  { name: 'Science', emoji: '🔬', query: 'science' },
  { name: 'Philosophy', emoji: '🤔', query: 'philosophy' },
  { name: 'Poetry', emoji: '✨', query: 'poetry' },
  { name: 'Self Help', emoji: '💪', query: 'self+help' },
];

function ExploreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSource = searchParams.get('source') || 'all';
  const initialQuery = searchParams.get('q') || '';

  const [activeTab, setActiveTab] = useState(initialSource);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [books, setBooks] = useState<Book[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [trendingBooks, setTrendingBooks] = useState<Book[]>([]);

  // Fetch trending books on mount
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        // Get trending from multiple sources
        const [googleBooks, amazonBooks, freeBooks] = await Promise.allSettled([
          searchGoogleBooks('fiction', 0, 10),
          getTrendingAmazonBooks(),
          api('/free-books/popular').then(res => res.ok ? res.json() : null)
        ]);

        let allTrending: Book[] = [];
        
        if (googleBooks.status === 'fulfilled') {
          allTrending = allTrending.concat(
            googleBooks.value.books.map(book => ({
              id: book.id,
              title: book.volumeInfo.title,
              authors: book.volumeInfo.authors,
              description: book.volumeInfo.description,
              coverImage: book.volumeInfo.imageLinks?.thumbnail,
              previewLink: book.volumeInfo.previewLink,
              infoLink: book.volumeInfo.infoLink,
              source: 'google' as const
            }))
          );
        }

        if (amazonBooks.status === 'fulfilled') {
          allTrending = allTrending.concat(
            amazonBooks.value.map(book => ({
              id: book.asin,
              title: book.title,
              authors: book.authors,
              coverImage: book.coverImage,
              description: book.description,
              asin: book.asin,
              price: book.price,
              currency: book.currency,
              url: book.url,
              rating: book.rating,
              reviewCount: book.reviewCount,
              source: 'amazon' as const
            }))
          );
        }

        if (freeBooks.status === 'fulfilled' && freeBooks.value) {
          allTrending = allTrending.concat(
            freeBooks.value.books?.slice(0, 5).map((book: any) => ({
              ...book,
              source: 'gutenberg' as const
            })) || []
          );
        }

        setTrendingBooks(allTrending.slice(0, 12));
      } catch (error) {
        console.error('Error fetching trending:', error);
      }
    };
    fetchTrending();
  }, []);

  // Fetch active rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await api('/rooms');
        if (response.ok) {
          const data = await response.json();
          setRooms(data.slice(0, 5));
        }
      } catch (error) {
        console.error('Error fetching rooms:', error);
      }
    };
    fetchRooms();
  }, []);

  const searchBooks = useCallback(async (query: string, source: string) => {
    if (!query.trim()) {
      setBooks([]);
      return;
    }

    setLoading(true);
    try {
      let results: Book[] = [];

      if (source === 'all' || source === 'google') {
        try {
          const googleData = await searchGoogleBooks(query, 0, 20);
          const googleBooks = googleData.books.map(book => ({
            id: book.id,
            title: book.volumeInfo.title,
            authors: book.volumeInfo.authors,
            description: book.volumeInfo.description,
            coverImage: book.volumeInfo.imageLinks?.thumbnail,
            previewLink: book.volumeInfo.previewLink,
            infoLink: book.volumeInfo.infoLink,
            source: 'google' as const
          }));
          results = [...results, ...googleBooks];
        } catch (error) {
          console.error('Google Books search error:', error);
        }
      }

      if (source === 'all' || source === 'amazon') {
        try {
          const amazonData = await searchAmazonBooks(query, 1);
          const amazonBooks = amazonData.books.map(book => ({
            id: book.asin,
            title: book.title,
            authors: book.authors,
            coverImage: book.coverImage,
            description: book.description,
            asin: book.asin,
            price: book.price,
            currency: book.currency,
            url: book.url,
            rating: book.rating,
            reviewCount: book.reviewCount,
            source: 'amazon' as const
          }));
          results = [...results, ...amazonBooks];
        } catch (error) {
          console.error('Amazon search error:', error);
        }
      }

      if (source === 'all' || source === 'free') {
        try {
          const gutenbergRes = await api(`/free-books/gutenberg?search=${encodeURIComponent(query)}`);
          if (gutenbergRes.ok) {
            const gutenbergData = await gutenbergRes.json();
            results = [...results, ...(gutenbergData.books || [])];
          }
        } catch (error) {
          console.error('Gutenberg search error:', error);
        }
      }

      if (source === 'all' || source === 'openlibrary') {
        try {
          const openLibRes = await api(`/free-books/openlibrary?search=${encodeURIComponent(query)}`);
          if (openLibRes.ok) {
            const openLibData = await openLibRes.json();
            results = [...results, ...(openLibData.books || [])];
          }
        } catch (error) {
          console.error('Open Library search error:', error);
        }
      }

      setBooks(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchBooks(searchQuery, activeTab);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab, searchBooks]);

  const handleCategoryClick = (query: string) => {
    setSearchQuery(query.replace('+', ' '));
  };

  const handleBookClick = (book: Book) => {
    // Handle Amazon Books
    if (book.source === 'amazon') {
      if (book.url) {
        window.open(book.url, '_blank');
      }
      return;
    }

    // Handle Google Books
    if (book.source === 'google') {
      if (book.previewLink) {
        window.open(book.previewLink, '_blank');
      } else if (book.infoLink) {
        window.open(book.infoLink, '_blank');
      }
      return;
    }

    // Handle Free Books (Gutenberg)
    if (book.source === 'gutenberg' && book.formats) {
      // Try to open EPUB in reader
      const epubUrl = book.formats['application/epub+zip'];
      if (epubUrl) {
        router.push(`/reader?url=${encodeURIComponent(epubUrl)}&title=${encodeURIComponent(book.title)}`);
        return;
      }
      // Fallback to HTML reader
      const htmlUrl = book.formats['text/html'];
      if (htmlUrl) {
        window.open(htmlUrl, '_blank');
        return;
      }
    }

    // Handle Open Library
    if (book.source === 'openlibrary') {
      // Check if it has Internet Archive access - load in our reader
      if (book.ia && book.ia.length > 0) {
        // Use Archive.org's BookReader embed URL for internal viewing
        const archiveId = book.ia[0];
        const readerUrl = `https://archive.org/stream/${archiveId}?ui=embed`;
        router.push(`/reader?url=${encodeURIComponent(readerUrl)}&title=${encodeURIComponent(book.title)}&source=archive`);
        return;
      }
      // Fallback to Open Library page if no IA access
      router.push(`/reader?url=${encodeURIComponent(`https://openlibrary.org${book.id.replace('openlibrary-', '')}`)}&title=${encodeURIComponent(book.title)}&source=openlibrary`);
      return;
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'gutenberg':
        return <Badge variant="secondary" className="text-xs">Free</Badge>;
      case 'openlibrary':
        return <Badge variant="outline" className="text-xs">Open Library</Badge>;
      case 'amazon':
        return <Badge variant="default" className="text-xs bg-yellow-100 text-yellow-800 border-yellow-300">Amazon</Badge>;
      default:
        return <Badge variant="default" className="text-xs">Google</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary" />
            Explore
          </h1>
          <p className="text-muted-foreground mt-1">
            Discover books from multiple sources
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search for books, authors, topics..."
            className="pl-10 h-12 text-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Source Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            All Sources
          </TabsTrigger>
          <TabsTrigger value="google" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Google Books
          </TabsTrigger>
          <TabsTrigger value="amazon" className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            Amazon Books
          </TabsTrigger>
          <TabsTrigger value="free" className="flex items-center gap-2">
            <BookMarked className="w-4 h-4" />
            Free Books
          </TabsTrigger>
          <TabsTrigger value="openlibrary" className="flex items-center gap-2">
            <Library className="w-4 h-4" />
            Open Library
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {/* Show search results if searching */}
          {searchQuery && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">
                Search Results {loading && <Loader2 className="inline w-5 h-5 animate-spin ml-2" />}
              </h2>

              {!loading && books.length === 0 && (
                <p className="text-muted-foreground">No books found. Try a different search term.</p>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {books.map((book) => (
                  <Card
                    key={book.id}
                    className="cursor-pointer hover:shadow-lg hover:border-primary/50 transition-all group overflow-hidden"
                    onClick={() => handleBookClick(book)}
                  >
                    <div className="aspect-[2/3] relative bg-secondary/30">
                      {(book.coverImage || book.coverUrl) ? (
                        <Image
                          src={book.coverImage || book.coverUrl || ''}
                          alt={book.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, 200px"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <BookOpen className="w-12 h-12 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2">
                        {getSourceBadge(book.source)}
                      </div>
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button size="sm" variant="secondary">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-medium text-sm truncate" title={book.title}>
                        {book.title}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {book.authors?.join(', ') || book.author || 'Unknown'}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Show discovery content when not searching */}
          {!searchQuery && (
            <div className="space-y-8">
              {/* Trending Section */}
              <section>
                <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5" />
                  Trending Books
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                  {trendingBooks.map((book) => (
                    <Card
                      key={book.id}
                      className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all overflow-hidden"
                      onClick={() => handleBookClick(book)}
                    >
                      <div className="aspect-[2/3] relative bg-secondary/30">
                        {book.coverImage ? (
                          <Image
                            src={book.coverImage}
                            alt={book.title}
                            fill
                            className="object-cover"
                            sizes="150px"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <BookOpen className="w-8 h-8 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-2">
                        <h3 className="font-medium text-xs truncate" title={book.title}>
                          {book.title}
                        </h3>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>

              {/* Categories */}
              <section>
                <h2 className="text-xl font-semibold mb-4">Browse by Category</h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {CATEGORIES.map((cat) => (
                    <Button
                      key={cat.name}
                      variant="outline"
                      className="h-auto py-4 flex flex-col gap-2 hover:border-primary hover:bg-primary/5"
                      onClick={() => handleCategoryClick(cat.query)}
                    >
                      <span className="text-2xl">{cat.emoji}</span>
                      <span className="text-xs">{cat.name}</span>
                    </Button>
                  ))}
                </div>
              </section>

              {/* Active Rooms */}
              {rooms.length > 0 && (
                <section>
                  <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5" />
                    Active Discussion Rooms
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rooms.map((room) => (
                      <Card
                        key={room.id}
                        className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all"
                        onClick={() => router.push(`/room/${room.id}`)}
                      >
                        <CardContent className="p-4">
                          <h3 className="font-semibold truncate">{room.name}</h3>
                          {room.description && (
                            <p className="text-sm text-muted-foreground truncate mt-1">
                              {room.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                            {room.genre && (
                              <Badge variant="secondary">{room.genre.name}</Badge>
                            )}
                            <span>{room._count?.participants || 0} online</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <MainLayout>
      <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
        <ExploreContent />
      </Suspense>
    </MainLayout>
  );
}
