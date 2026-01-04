'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { getToken } from '../../lib/auth';
import MainLayout from '../../components/MainLayout';
import { searchBooks, getTrendingBooks, getNewReleases, GoogleBook } from '../../lib/google-books';
import type { FormEvent } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import { Search, ArrowLeft, Flame, Sparkles, Book, User, Plus } from 'lucide-react';
import { cn } from '../../lib/utils';

export const dynamic = 'force-dynamic';

// Popular book categories for browsing
const POPULAR_CATEGORIES = [
  { id: 'fiction', name: 'Fiction', icon: '📖' },
  { id: 'science-fiction', name: 'Science Fiction', icon: '🚀' },
  { id: 'fantasy', name: 'Fantasy', icon: '🐉' },
  { id: 'mystery', name: 'Mystery', icon: '🔍' },
  { id: 'thriller', name: 'Thriller', icon: '😱' },
  { id: 'romance', name: 'Romance', icon: '💕' },
  { id: 'horror', name: 'Horror', icon: '👻' },
  { id: 'biography', name: 'Biography', icon: '👤' },
  { id: 'history', name: 'History', icon: '🏛️' },
  { id: 'philosophy', name: 'Philosophy', icon: '🤔' },
  { id: 'psychology', name: 'Psychology', icon: '🧠' },
  { id: 'self-help', name: 'Self Help', icon: '💪' },
  { id: 'business', name: 'Business', icon: '💼' },
  { id: 'technology', name: 'Technology', icon: '💻' },
  { id: 'poetry', name: 'Poetry', icon: '✒️' },
  { id: 'comics', name: 'Comics & Manga', icon: '🎨' },
  { id: 'young-adult', name: 'Young Adult', icon: '🌟' },
  { id: 'classics', name: 'Classics', icon: '📜' },
];

interface Room {
  id: string;
  name: string;
  description: string;
  host: { name: string };
  genreId?: string;
  genre?: { name: string; isAdult: boolean };
  _count: { messages: number; participants: number };
}

interface Genre {
  id: string;
  name: string;
  isAdult: boolean;
  description: string;
  _count: { rooms: number };
}

type ViewMode = 'genres' | 'books';

export default function Dashboard() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  
  // Book Centric State
  const [viewMode, setViewMode] = useState<ViewMode>('genres');
  const [bookList, setBookList] = useState<GoogleBook[]>([]);
  const [activeGenreName, setActiveGenreName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Infinite scroll state
  const [currentQuery, setCurrentQuery] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const bookListRef = useRef<HTMLDivElement>(null);

  // Featured sections
  const [trendingBooks, setTrendingBooks] = useState<GoogleBook[]>([]);
  const [newReleases, setNewReleases] = useState<GoogleBook[]>([]);

  // Room Creation State
  const [open, setOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedBook, setSelectedBook] = useState<GoogleBook | null>(null);

  const [mounted, setMounted] = useState(false);
    
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [roomsRes, genresRes, trending, releases] = await Promise.all([
        api('/rooms'),
        api('/rooms/genres'),
        getTrendingBooks(),
        getNewReleases()
      ]);

      if (!roomsRes.ok || !genresRes.ok) throw new Error("Link synchronization failed.");

      const roomsData = await roomsRes.json();
      const genresData = await genresRes.json();

      setRooms(roomsData);
      setGenres(genresData);
      setTrendingBooks(trending);
      setNewReleases(releases);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Neural connection lost.');
    } finally {
      setLoading(false);
    }
  }, []);
    
      useEffect(() => {
        setMounted(true);
        if (!getToken()) {
          router.push('/');
          return;
        }
        fetchData();
      }, [router, fetchData]);
    
    const handleSearch = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      setIsSearching(true);
      const result = await searchBooks(searchQuery, 0, 20);
      setBookList(result.books);
      setHasMore(result.hasMore);
      setCurrentQuery(searchQuery);
      setActiveGenreName(`Search: "${searchQuery}"`);
      setViewMode('books');
    } catch {
      // Search failed
    } finally {
      setIsSearching(false);
    }
  };

  const handleGenreClick = async (genre: Genre) => {
    try {
      setIsSearching(true);
      const result = await searchBooks(genre.name, 0, 20);
      setBookList(result.books);
      setHasMore(result.hasMore);
      setCurrentQuery(genre.name);
      setActiveGenreName(genre.name);
      setViewMode('books');
    } catch {
      // Genre search failed
    } finally {
      setIsSearching(false);
    }
  };

  const handleCategoryClick = async (category: { id: string; name: string }) => {
    try {
      setIsSearching(true);
      const result = await searchBooks(`subject:${category.id}`, 0, 20);
      setBookList(result.books);
      setHasMore(result.hasMore);
      setCurrentQuery(`subject:${category.id}`);
      setActiveGenreName(category.name);
      setViewMode('books');
    } catch {
      // Category search failed
    } finally {
      setIsSearching(false);
    }
  };

  const loadMoreBooks = useCallback(async () => {
    if (loadingMore || !hasMore || !currentQuery) return;
    try {
      setLoadingMore(true);
      const result = await searchBooks(currentQuery, bookList.length, 20);
      setBookList(prev => [...prev, ...result.books]);
      setHasMore(result.hasMore);
    } catch {
      // Load more failed
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, currentQuery, bookList.length]);

  // Infinite scroll detection
  useEffect(() => {
    if (viewMode !== 'books') return;

    const handleScroll = () => {
      // Use window.innerHeight and window.scrollY for better compatibility
      const { innerHeight, scrollY } = window;
      const { scrollHeight } = document.body;
      
      // If we are near the bottom of the page (within 500px)
      if (scrollY + innerHeight >= scrollHeight - 500) {
        loadMoreBooks();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [viewMode, loadMoreBooks]);

    const handleDiscussBook = (book: GoogleBook) => {
      setNewRoomName(`Reading: ${book.volumeInfo.title}`);
      setNewRoomDesc(`Discussion room for "${book.volumeInfo.title}" by ${book.volumeInfo.authors?.join(', ')}. Join us to read and discuss!`);
      setSelectedBook(book); // Store selected book
      setOpen(true);
    };
  
    const handleCreateRoom = async () => {
      try {
        const body: {
          name: string;
          description: string;
          genreId: string;
          bookData?: {
            id: string;
            title?: string;
            authors?: string[];
            description?: string;
            imageLinks?: { thumbnail?: string; smallThumbnail?: string };
            industryIdentifiers?: Array<{ type: string; identifier: string }>;
            pageCount?: number;
            publisher?: string;
          };
        } = {
            name: newRoomName,
            description: newRoomDesc,
            genreId: selectedGenre
        };
  
        // Pass raw Google Book data if available
        if (selectedBook) {
            body.bookData = {
                id: selectedBook.id,
                ...selectedBook.volumeInfo
            };
        }
  
        const res = await api('/rooms', {
          method: 'POST',
          body: JSON.stringify(body)
        });
        if (res.ok) {
          setOpen(false);
          setNewRoomName('');
          setNewRoomDesc('');
          setSelectedBook(null);
          // Don't reset genre here so they stay in context
          fetchData();
          // Optionally redirect to the new room?
          const room = await res.json();
          router.push(`/room/${room.id}`);
        }
      } catch {
        // Failed to create room
      }
    };

  if (!mounted) return null;

  return (
    <MainLayout>
      <div className="container mx-auto px-4 sm:px-6">
        {/* Header Section */}
        <div className="mb-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-xs sm:text-sm font-bold tracking-[0.2em] text-primary block mb-1">
                SYSTEM_STATUS: OPERATIONAL // BOOK_DB_ONLINE
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-6xl font-black text-foreground mb-2">
                LITERARY_NEXUS
              </h1>
            </div>
            <form onSubmit={handleSearch} className="w-full max-w-xs relative">
              <Input
                placeholder="SEARCH_DATABASE..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
              <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:text-primary/80">
                <Search size={20} />
              </button>
            </form>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-[300px] bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            {viewMode === 'genres' ? (
              <>
                {/* Trending Books Section */}
                {trendingBooks.length > 0 && (
                  <div className="mb-12">
                    <div className="flex items-center gap-2 mb-6">
                      <Flame className="text-destructive" />
                      <h2 className="text-2xl font-bold text-destructive">TRENDING_NOW</h2>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-4">
                      {trendingBooks.map((book) => (
                        <Card key={book.id} className="min-w-[180px] max-w-[180px] flex-shrink-0">
                          <div className="h-[200px] bg-black p-2 flex items-center justify-center rounded-t-lg">
                            {book.volumeInfo.imageLinks?.thumbnail && (
                              <img
                                src={book.volumeInfo.imageLinks.thumbnail.replace('http:', 'https:')}
                                alt={book.volumeInfo.title}
                                className="h-full object-contain"
                              />
                            )}
                          </div>
                          <CardContent className="p-3">
                            <p className="text-sm font-bold truncate mb-1" title={book.volumeInfo.title}>
                              {book.volumeInfo.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate mb-2">
                              {book.volumeInfo.authors?.[0] || 'Unknown'}
                            </p>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="w-full text-xs" 
                              onClick={() => handleDiscussBook(book)}
                            >
                              DISCUSS
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* New Releases Section */}
                {newReleases.length > 0 && (
                  <div className="mb-12">
                    <div className="flex items-center gap-2 mb-6">
                      <Sparkles className="text-secondary-foreground" />
                      <h2 className="text-2xl font-bold text-secondary-foreground">NEW_RELEASES</h2>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-4">
                      {newReleases.map((book) => (
                        <Card key={book.id} className="min-w-[180px] max-w-[180px] flex-shrink-0">
                          <div className="h-[200px] bg-black p-2 flex items-center justify-center rounded-t-lg">
                            {book.volumeInfo.imageLinks?.thumbnail && (
                              <img
                                src={book.volumeInfo.imageLinks.thumbnail.replace('http:', 'https:')}
                                alt={book.volumeInfo.title}
                                className="h-full object-contain"
                              />
                            )}
                          </div>
                          <CardContent className="p-3">
                            <p className="text-sm font-bold truncate mb-1" title={book.volumeInfo.title}>
                              {book.volumeInfo.title}
                            </p>
                            <p className="text-xs text-muted-foreground truncate mb-2">
                              {book.volumeInfo.authors?.[0] || 'Unknown'}
                            </p>
                            <Button 
                              size="sm" 
                              variant="secondary" 
                              className="w-full text-xs" 
                              onClick={() => handleDiscussBook(book)}
                            >
                              DISCUSS
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Popular Categories */}
                <div className="mb-12">
                  <div className="flex items-center gap-2 mb-6">
                    <Book className="text-primary" />
                    <h2 className="text-2xl font-bold text-primary">BROWSE_BY_CATEGORY</h2>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {POPULAR_CATEGORIES.map((category) => (
                      <div
                        key={category.id}
                        onClick={() => handleCategoryClick(category)}
                        className="h-32 rounded-lg border bg-card hover:border-primary hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer flex flex-col items-center justify-center p-4 text-center"
                      >
                        <span className="text-3xl mb-2">{category.icon}</span>
                        <span className="text-sm font-bold">{category.name.toUpperCase()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Room Genres (from API) */}
                {genres.length > 0 && (
                  <div className="mb-12">
                    <h2 className="text-2xl font-bold text-muted-foreground mb-6">ROOM_GENRES</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      {genres.map((genre) => (
                        <div
                          key={genre.id}
                          onClick={() => handleGenreClick(genre)}
                          className="h-28 rounded-lg border bg-card hover:border-secondary hover:shadow-lg hover:scale-[1.02] transition-all cursor-pointer flex flex-col items-center justify-center p-4 text-center relative"
                        >
                          <span className="text-sm font-bold">{genre.name.toUpperCase()}</span>
                          {genre.isAdult && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-destructive text-destructive-foreground mt-1">
                              18+
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground mt-1">{genre._count.rooms} rooms</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
                // Book Grid with Infinite Scroll
                <div ref={bookListRef} className="mb-20">
                    <div className="flex items-center gap-4 mb-8">
                        <Button variant="ghost" onClick={() => setViewMode('genres')} className="gap-2">
                          <ArrowLeft size={16} /> BACK
                        </Button>
                        <h2 className="text-3xl font-bold text-secondary-foreground">
                            {activeGenreName.toUpperCase()}
                        </h2>
                        <span className="ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                          {bookList.length} books
                        </span>
                    </div>

                    {isSearching && bookList.length === 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[1,2,3,4,5,6,7,8].map(i => (
                          <div key={i} className="h-[400px] bg-muted animate-pulse rounded-lg" />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {bookList.map((book) => (
                          <Card key={book.id} className="flex flex-col h-full hover:border-primary transition-colors">
                            <div className="h-[280px] bg-black p-4 flex items-center justify-center rounded-t-lg relative group">
                              {book.volumeInfo.imageLinks?.thumbnail ? (
                                <img
                                  src={book.volumeInfo.imageLinks.thumbnail.replace('http:', 'https:')}
                                  alt={book.volumeInfo.title}
                                  className="h-full object-contain shadow-md group-hover:scale-105 transition-transform"
                                />
                              ) : (
                                <div className="text-muted-foreground text-sm">No Cover</div>
                              )}
                              <Button
                                size="icon"
                                className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity rounded-full shadow-lg"
                                onClick={() => handleDiscussBook(book)}
                              >
                                <Plus size={20} />
                              </Button>
                            </div>
                            <CardContent className="flex-1 p-4">
                              <h3 className="font-bold line-clamp-2 mb-1" title={book.volumeInfo.title}>
                                {book.volumeInfo.title}
                              </h3>
                              <p className="text-sm text-muted-foreground mb-2">
                                {book.volumeInfo.authors?.[0] || 'Unknown Author'}
                              </p>
                              {book.volumeInfo.averageRating && (
                                <div className="flex items-center gap-1 text-yellow-500 text-sm mb-2">
                                  <span>★</span>
                                  <span>{book.volumeInfo.averageRating}</span>
                                </div>
                              )}
                              <p className="text-xs text-muted-foreground line-clamp-3">
                                {book.volumeInfo.description || 'No description available.'}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                    
                    {loadingMore && (
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
                        {[1,2,3,4].map(i => (
                          <div key={i} className="h-[400px] bg-muted animate-pulse rounded-lg" />
                        ))}
                      </div>
                    )}
                    
                    {!hasMore && bookList.length > 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        End of results
                      </div>
                    )}
                </div>
            )}
          </>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a Book Discussion</DialogTitle>
            <DialogDescription>
              Create a room to discuss "{selectedBook?.volumeInfo.title}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Room Name</label>
              <Input
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Enter room name..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Input
                value={newRoomDesc}
                onChange={(e) => setNewRoomDesc(e.target.value)}
                placeholder="What will you discuss?"
              />
            </div>
            {/* Genre selection could be a select, for now simplified */}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateRoom} disabled={!newRoomName}>Create Room</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
