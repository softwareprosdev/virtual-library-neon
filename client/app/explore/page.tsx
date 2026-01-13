'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  BookOpen,
  TrendingUp,
  Loader2,
  Play,
  ChevronLeft,
  ChevronRight,
  Star,
  Sparkles,
  Filter
} from 'lucide-react';
import { api } from '@/lib/api';
import { searchBooks as searchGoogleBooks } from '@/lib/google-books';

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
  ia?: string[];
  rating?: number;
}

const GENRES = [
  { name: 'All', query: 'bestseller' },
  { name: 'Fiction', query: 'fiction' },
  { name: 'Sci-Fi', query: 'science fiction' },
  { name: 'Fantasy', query: 'fantasy' },
  { name: 'Mystery', query: 'mystery thriller' },
  { name: 'Romance', query: 'romance' },
  { name: 'Horror', query: 'horror' },
  { name: 'Biography', query: 'biography' },
  { name: 'History', query: 'history' },
  { name: 'Science', query: 'science' },
  { name: 'Self-Help', query: 'self improvement' },
];

// Auto-scrolling carousel component
function AutoScrollCarousel({ 
  books, 
  direction = 'left', 
  onBookClick,
  title 
}: { 
  books: Book[]; 
  direction?: 'left' | 'right';
  onBookClick: (book: Book) => void;
  title: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || books.length === 0) return;

    let animationFrame: number;
    const speed = direction === 'left' ? 0.5 : -0.5;

    const scroll = () => {
      if (!isPaused && container) {
        container.scrollLeft += speed;
        
        // Reset scroll position for infinite effect
        if (direction === 'left' && container.scrollLeft >= container.scrollWidth / 2) {
          container.scrollLeft = 0;
        } else if (direction === 'right' && container.scrollLeft <= 0) {
          container.scrollLeft = container.scrollWidth / 2;
        }
      }
      animationFrame = requestAnimationFrame(scroll);
    };

    animationFrame = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animationFrame);
  }, [books, direction, isPaused]);

  // Duplicate books for seamless loop
  const displayBooks = [...books, ...books];

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-white px-4 flex items-center gap-2">
        {direction === 'left' ? <TrendingUp className="w-5 h-5 text-primary" /> : <Sparkles className="w-5 h-5 text-yellow-400" />}
        {title}
      </h2>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-hidden py-2 px-4"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {displayBooks.map((book, idx) => (
          <motion.div
            key={`${book.id}-${idx}`}
            className="flex-shrink-0 w-32 md:w-40 cursor-pointer group"
            whileHover={{ scale: 1.08, zIndex: 10 }}
            transition={{ type: 'spring', stiffness: 300 }}
            onClick={() => onBookClick(book)}
          >
            <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-lg group-hover:shadow-2xl group-hover:shadow-primary/20 transition-shadow">
              {book.coverImage || book.coverUrl ? (
                <Image
                  src={book.coverImage || book.coverUrl || ''}
                  alt={book.title}
                  fill
                  className="object-cover"
                  sizes="160px"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/30 to-purple-600/30 flex items-center justify-center">
                  <BookOpen className="w-10 h-10 text-white/50" />
                </div>
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                <div className="flex items-center gap-1 text-yellow-400 text-xs mb-1">
                  <Star className="w-3 h-3 fill-current" />
                  <span>{book.rating || '4.5'}</span>
                </div>
                <Button size="sm" className="w-full h-8 text-xs bg-primary hover:bg-primary/90">
                  <Play className="w-3 h-3 mr-1" /> Read
                </Button>
              </div>
            </div>
            <p className="text-xs text-white/80 mt-2 truncate font-medium">{book.title}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ExploreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [activeGenre, setActiveGenre] = useState('All');
  const [trendingRow1, setTrendingRow1] = useState<Book[]>([]);
  const [trendingRow2, setTrendingRow2] = useState<Book[]>([]);
  const observerRef = useRef<HTMLDivElement>(null);

  // Fetch trending books for carousels
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const [fiction, sciFi] = await Promise.allSettled([
          searchGoogleBooks('bestseller fiction', 0, 20),
          searchGoogleBooks('popular fantasy adventure', 0, 20),
        ]);

        if (fiction.status === 'fulfilled') {
          setTrendingRow1(fiction.value.books.map(b => ({
            id: b.id,
            title: b.volumeInfo.title,
            authors: b.volumeInfo.authors,
            coverImage: b.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:'),
            previewLink: b.volumeInfo.previewLink,
            source: 'google' as const
          })));
        }

        if (sciFi.status === 'fulfilled') {
          setTrendingRow2(sciFi.value.books.map(b => ({
            id: b.id,
            title: b.volumeInfo.title,
            authors: b.volumeInfo.authors,
            coverImage: b.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:'),
            previewLink: b.volumeInfo.previewLink,
            source: 'google' as const
          })));
        }
      } catch (error) {
        console.error('Error fetching trending:', error);
      }
    };
    fetchTrending();
  }, []);

  // Search books with pagination - includes free sources
  const searchBooks = useCallback(async (query: string, pageNum: number, append = false) => {
    if (!query.trim()) return;
    
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      const startIndex = pageNum * 20;
      
      // Search multiple sources in parallel
      const [googleResult, gutenbergResult, openLibResult] = await Promise.allSettled([
        searchGoogleBooks(query, startIndex, 15),
        pageNum === 0 ? api(`/free-books/gutenberg?search=${encodeURIComponent(query)}`).then(r => r.ok ? r.json() : null) : null,
        pageNum === 0 ? api(`/free-books/openlibrary?search=${encodeURIComponent(query)}`).then(r => r.ok ? r.json() : null) : null,
      ]);
      
      let allBooks: Book[] = [];
      
      // Google Books
      if (googleResult.status === 'fulfilled' && googleResult.value) {
        allBooks = googleResult.value.books.map(book => ({
          id: book.id,
          title: book.volumeInfo.title,
          authors: book.volumeInfo.authors,
          description: book.volumeInfo.description,
          coverImage: book.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:'),
          previewLink: book.volumeInfo.previewLink,
          infoLink: book.volumeInfo.infoLink,
          source: 'google' as const
        }));
      }
      
      // Gutenberg free books (only on first page)
      if (pageNum === 0 && gutenbergResult.status === 'fulfilled' && gutenbergResult.value) {
        const gutenbergBooks = (gutenbergResult.value.books || []).slice(0, 8).map((book: any) => ({
          id: `gutenberg-${book.id}`,
          title: book.title,
          authors: book.authors || [],
          coverImage: book.coverUrl,
          formats: book.formats,
          source: 'gutenberg' as const
        }));
        // Mix free books at the start
        allBooks = [...gutenbergBooks, ...allBooks];
      }
      
      // Open Library (only on first page)
      if (pageNum === 0 && openLibResult.status === 'fulfilled' && openLibResult.value) {
        const openLibBooks = (openLibResult.value.books || []).slice(0, 5).map((book: any) => ({
          id: book.id,
          title: book.title,
          authors: book.authors || [],
          coverImage: book.coverUrl,
          ia: book.ia,
          source: 'openlibrary' as const
        }));
        allBooks = [...openLibBooks, ...allBooks];
      }

      if (append) {
        setBooks(prev => [...prev, ...allBooks]);
      } else {
        setBooks(allBooks);
      }
      
      setHasMore(allBooks.length >= 10);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Initial search based on genre
  useEffect(() => {
    const genre = GENRES.find(g => g.name === activeGenre);
    if (genre) {
      setPage(0);
      setBooks([]);
      searchBooks(searchQuery || genre.query, 0);
    }
  }, [activeGenre, searchBooks]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery) return;
    const timer = setTimeout(() => {
      setPage(0);
      searchBooks(searchQuery, 0);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, searchBooks]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          const genre = GENRES.find(g => g.name === activeGenre);
          searchBooks(searchQuery || genre?.query || 'bestseller', nextPage, true);
        }
      },
      { threshold: 0.1 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, page, searchQuery, activeGenre, searchBooks]);

  const handleBookClick = (book: Book) => {
    if (book.source === 'google' && book.previewLink) {
      router.push(`/reader?url=${encodeURIComponent(book.previewLink)}&title=${encodeURIComponent(book.title)}&source=google`);
    } else if (book.formats?.['application/epub+zip']) {
      router.push(`/reader?url=${encodeURIComponent(book.formats['application/epub+zip'])}&title=${encodeURIComponent(book.title)}`);
    } else if (book.ia && book.ia.length > 0) {
      router.push(`/reader?url=${encodeURIComponent(`https://archive.org/embed/${book.ia[0]}`)}&title=${encodeURIComponent(book.title)}&source=archive`);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Search Section */}
      <div className="relative py-8 px-4 mb-6">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
        <div className="relative max-w-2xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-center mb-2 bg-gradient-to-r from-white via-primary to-purple-400 bg-clip-text text-transparent">
            Discover Your Next Read
          </h1>
          <p className="text-center text-white/60 mb-6 text-sm">
            Millions of books from Google, Gutenberg & Open Library
          </p>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <Input
              placeholder="Search books, authors, topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-14 pl-12 pr-4 text-lg bg-white/5 border-white/10 text-white placeholder:text-white/40 rounded-2xl focus:bg-white/10 focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Genre Pills */}
      <div className="px-4 mb-6 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 pb-2">
          {GENRES.map((genre) => (
            <Button
              key={genre.name}
              variant={activeGenre === genre.name ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setActiveGenre(genre.name);
                setSearchQuery('');
              }}
              className={`flex-shrink-0 rounded-full px-4 ${
                activeGenre === genre.name 
                  ? 'bg-primary text-white' 
                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {genre.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Auto-Scrolling Carousels (only show when not searching) */}
      {!searchQuery && (
        <div className="space-y-6 mb-8">
          <AutoScrollCarousel 
            books={trendingRow1} 
            direction="left" 
            onBookClick={handleBookClick}
            title="Trending Now"
          />
          <AutoScrollCarousel 
            books={trendingRow2} 
            direction="right" 
            onBookClick={handleBookClick}
            title="Popular This Week"
          />
        </div>
      )}

      {/* Search Results / Browse Grid */}
      <div className="px-4">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Filter className="w-5 h-5 text-primary" />
          {searchQuery ? `Results for "${searchQuery}"` : `Browse ${activeGenre}`}
          {loading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
        </h2>

        {!loading && books.length === 0 && (
          <div className="text-center py-20 text-white/50">
            <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>No books found. Try a different search.</p>
          </div>
        )}

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4">
          <AnimatePresence>
            {books.map((book, idx) => {
              const isFree = book.source === 'gutenberg' || book.source === 'openlibrary';
              return (
              <motion.div
                key={`${book.id}-${idx}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                className="cursor-pointer group"
                onClick={() => handleBookClick(book)}
              >
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-white/5 shadow-md group-hover:shadow-xl group-hover:shadow-primary/10 transition-all group-hover:scale-105">
                  {book.coverImage || book.coverUrl ? (
                    <Image
                      src={book.coverImage || book.coverUrl || ''}
                      alt={book.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 33vw, 150px"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-purple-600/20 flex items-center justify-center">
                      <BookOpen className="w-8 h-8 text-white/30" />
                    </div>
                  )}
                  {/* Free badge */}
                  {isFree && (
                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-md shadow-lg">
                      FREE
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                      <Play className="w-5 h-5 text-white fill-white" />
                    </div>
                    <span className="text-white text-xs font-medium">
                      {isFree ? 'Read Free' : 'Preview'}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-white/70 mt-2 truncate">{book.title}</p>
                <p className="text-[10px] text-white/40 truncate">{book.authors?.join(', ') || 'Unknown'}</p>
              </motion.div>
            );})}
          </AnimatePresence>
        </div>

        {/* Infinite scroll trigger */}
        <div ref={observerRef} className="h-20 flex items-center justify-center">
          {loadingMore && (
            <div className="flex items-center gap-2 text-white/50">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading more books...</span>
            </div>
          )}
          {!hasMore && books.length > 0 && (
            <p className="text-white/30 text-sm">You've seen it all! 📚</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <MainLayout>
      <Suspense fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }>
        <ExploreContent />
      </Suspense>
    </MainLayout>
  );
}
