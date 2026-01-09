'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import MainLayout from '../../components/MainLayout';
import { Compass, Search, Book, User, Calendar, BookOpen, Globe, ExternalLink, Loader2 } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { api } from '../../lib/api';
import Image from 'next/image';

interface LibraryBook {
  id: string;
  title: string;
  author: string;
  fileUrl: string;
  fileType: string;
  createdAt: string;
  content?: string;
}

interface GoogleBook {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    imageLinks?: {
      thumbnail?: string;
    };
    publishedDate?: string;
    previewLink?: string;
    infoLink?: string;
  };
}

interface GutenbergBook {
  id: string;
  title: string;
  authors: string[];
  coverImage: string | null;
  formats: Record<string, string>;
  downloadCount?: number;
  source: 'gutenberg';
}

interface OpenLibraryBook {
  id: string;
  title: string;
  authors: string[];
  coverImage: string | null;
  openLibraryId: string;
  hasFulltext?: boolean;
  ia?: string[];
  publishYear?: number;
  source: 'openlibrary';
}

type SearchResult = LibraryBook | GoogleBook | GutenbergBook | OpenLibraryBook;

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
  { id: 'erotica', name: 'Erotica', icon: '💋' },
  { id: 'dark-romance', name: 'Dark Romance', icon: '🥀' },
  { id: 'lgbtq', name: 'LGBTQ+', icon: '🏳️‍🌈' },
];

export default function BrowsePage() {
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTab, setSearchTab] = useState<'library' | 'google' | 'gutenberg' | 'openlibrary'>('library');
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const startIndexRef = useRef(0);
  const pageRef = useRef(1);

  // Search user's library
  const searchLibrary = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await api(`/books/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setSearchResults(data.books || []);
      setHasMore(false);
    } catch (error) {
      console.error('Library search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Search Google Books API
  const searchGoogleBooks = useCallback(async (query: string, append = false) => {
    if (!query.trim()) {
      setSearchResults([]);
      startIndexRef.current = 0;
      return;
    }

    if (append) {
      setLoadingMore(true);
    } else {
      setIsSearching(true);
      startIndexRef.current = 0;
      setSearchResults([]);
    }

    try {
      const currentIndex = append ? startIndexRef.current : 0;
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20&startIndex=${currentIndex}`);
      const data = await response.json();
      const newItems = data.items || [];
      
      if (append) {
        setSearchResults(prev => [...prev, ...newItems]);
      } else {
        setSearchResults(newItems);
      }
      
      startIndexRef.current = currentIndex + newItems.length;
      setHasMore(data.totalItems > startIndexRef.current);
    } catch (error) {
      console.error('Google Books search failed:', error);
      if (!append) setSearchResults([]);
    } finally {
      setIsSearching(false);
      setLoadingMore(false);
    }
  }, []);

  // Search Gutenberg
  const searchGutenberg = useCallback(async (query: string, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setIsSearching(true);
      pageRef.current = 1;
      setSearchResults([]);
    }

    try {
      const currentPage = append ? pageRef.current : 1;
      const searchParam = query.trim() ? `&search=${encodeURIComponent(query)}` : '';
      const response = await api(`/free-books/gutenberg?page=${currentPage}${searchParam}`);
      const data = await response.json();
      
      if (append) {
        setSearchResults(prev => [...prev, ...(data.books || [])]);
      } else {
        setSearchResults(data.books || []);
      }
      
      pageRef.current = currentPage + 1;
      setHasMore(!!data.next);
    } catch (error) {
      console.error('Gutenberg search failed:', error);
      if (!append) setSearchResults([]);
    } finally {
      setIsSearching(false);
      setLoadingMore(false);
    }
  }, []);

  // Search Open Library
  const searchOpenLibrary = useCallback(async (query: string, append = false) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    if (append) {
      setLoadingMore(true);
    } else {
      setIsSearching(true);
      pageRef.current = 1;
      setSearchResults([]);
    }

    try {
      const currentPage = append ? pageRef.current : 1;
      const response = await api(`/free-books/openlibrary?search=${encodeURIComponent(query)}&page=${currentPage}`);
      const data = await response.json();
      
      if (append) {
        setSearchResults(prev => [...prev, ...(data.books || [])]);
      } else {
        setSearchResults(data.books || []);
      }
      
      pageRef.current = currentPage + 1;
      const totalPages = Math.ceil((data.totalFound || 0) / 20);
      setHasMore(currentPage < totalPages);
    } catch (error) {
      console.error('Open Library search failed:', error);
      if (!append) setSearchResults([]);
    } finally {
      setIsSearching(false);
      setLoadingMore(false);
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasMore(true);
      if (searchTab === 'library') {
        searchLibrary(search);
      } else if (searchTab === 'google') {
        searchGoogleBooks(search);
      } else if (searchTab === 'gutenberg') {
        searchGutenberg(search);
      } else if (searchTab === 'openlibrary') {
        if (search.trim()) {
          searchOpenLibrary(search);
        } else {
          setSearchResults([]);
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [search, searchTab, searchLibrary, searchGoogleBooks, searchGutenberg, searchOpenLibrary]);

  // Infinite scroll - works on both window and scrollable containers
  useEffect(() => {
    if (!hasMore || loadingMore || isSearching) return;

    const handleScroll = () => {
      // Check both window scroll and any scrollable parent
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      
      // Also check for scrollable main container (mobile layout)
      const mainElement = document.querySelector('main');
      const mainScrollTop = mainElement?.scrollTop || 0;
      const mainScrollHeight = mainElement?.scrollHeight || 0;
      const mainClientHeight = mainElement?.clientHeight || 0;
      
      const windowNearBottom = scrollTop + clientHeight >= scrollHeight - 1000;
      const mainNearBottom = mainScrollTop + mainClientHeight >= mainScrollHeight - 1000;
      
      if (windowNearBottom || mainNearBottom) {
        if (searchTab === 'google' && search.trim()) {
          searchGoogleBooks(search, true);
        } else if (searchTab === 'gutenberg') {
          searchGutenberg(search, true);
        } else if (searchTab === 'openlibrary' && search.trim()) {
          searchOpenLibrary(search, true);
        }
      }
    };

    // Listen to both window and main element scroll
    const mainElement = document.querySelector('main');
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    mainElement?.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      mainElement?.removeEventListener('scroll', handleScroll);
    };
  }, [searchTab, hasMore, loadingMore, isSearching, search, searchGoogleBooks, searchGutenberg, searchOpenLibrary]);

  const isGoogleBook = (item: SearchResult): item is GoogleBook => {
    return 'volumeInfo' in item;
  };

  const isGutenbergBook = (item: SearchResult): item is GutenbergBook => {
    return 'source' in item && item.source === 'gutenberg';
  };

  const isOpenLibraryBook = (item: SearchResult): item is OpenLibraryBook => {
    return 'source' in item && item.source === 'openlibrary';
  };

  const isLibraryBook = (item: SearchResult): item is LibraryBook => {
    return 'fileUrl' in item;
  };

  const handleCategoryClick = (categoryId: string) => {
    setSearch(categoryId);
    setSearchTab('gutenberg');
  };

  return (
    <MainLayout>
      <div className="mb-12">
        <h1 className="text-4xl font-black mb-2 flex items-center gap-3">
          <Compass className="h-8 w-8 text-primary" />
          EXPLORE_ARCHIVES
        </h1>
        <p className="text-muted-foreground mb-8">Dive into the vast data streams of literary content.</p>

        <div className="relative max-w-xl mb-6">
            <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input 
                className="pl-10 py-6 text-lg bg-card/50 backdrop-blur" 
                placeholder="Search for titles, authors, or ISBNs..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
            />
        </div>

        {/* Source Tabs - Always visible */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSearchTab('library')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              searchTab === 'library' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-card/50 text-muted-foreground hover:bg-card'
            }`}
          >
            <Book className="h-4 w-4" />
            My Library
          </button>
          <button
            onClick={() => setSearchTab('google')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              searchTab === 'google' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-card/50 text-muted-foreground hover:bg-card'
            }`}
          >
            <Search className="h-4 w-4" />
            Google Books
          </button>
          <button
            onClick={() => setSearchTab('gutenberg')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              searchTab === 'gutenberg' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-card/50 text-muted-foreground hover:bg-card'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Gutenberg
          </button>
          <button
            onClick={() => setSearchTab('openlibrary')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              searchTab === 'openlibrary' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-card/50 text-muted-foreground hover:bg-card'
            }`}
          >
            <Globe className="h-4 w-4" />
            Open Library
          </button>
        </div>

        {/* Search Results */}
        {(search || searchTab === 'gutenberg') && (
          <div className="mb-8">
            {isSearching ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="mt-2 text-muted-foreground">Searching...</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="grid gap-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">
                    {searchResults.length}+ results found
                  </h3>
                </div>
                <div className="grid gap-4">
                  {searchResults.map((item) => {
                    // Google Books
                    if (isGoogleBook(item)) {
                      return (
                        <Card key={item.id} className="p-6 hover:border-primary transition-all bg-card/50">
                          <div className="flex gap-4">
                            {item.volumeInfo.imageLinks?.thumbnail ? (
                              <Image 
                                src={item.volumeInfo.imageLinks.thumbnail} 
                                alt={item.volumeInfo.title}
                                width={80}
                                height={120}
                                className="object-cover rounded border border-border"
                              />
                            ) : (
                              <div className="w-20 h-30 bg-secondary/20 rounded border border-border flex items-center justify-center">
                                <Book className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg">{item.volumeInfo.title}</h4>
                              <p className="text-muted-foreground">
                                {item.volumeInfo.authors?.join(', ') || 'Unknown Author'}
                              </p>
                              {item.volumeInfo.publishedDate && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                  <Calendar className="h-3 w-3" />
                                  {item.volumeInfo.publishedDate}
                                </p>
                              )}
                              {item.volumeInfo.description && (
                                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                  {item.volumeInfo.description}
                                </p>
                              )}
                              <div className="flex gap-2 mt-3">
                                {item.volumeInfo.previewLink && (
                                  <Button
                                    size="sm"
                                    onClick={() => window.open(item.volumeInfo.previewLink, '_blank')}
                                  >
                                    <BookOpen className="h-4 w-4 mr-2" />
                                    Preview
                                  </Button>
                                )}
                                {item.volumeInfo.infoLink && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(item.volumeInfo.infoLink, '_blank')}
                                  >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    More Info
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    }
                    
                    // Gutenberg Books
                    if (isGutenbergBook(item)) {
                      return (
                        <Card key={item.id} className="p-6 hover:border-primary transition-all bg-card/50">
                          <div className="flex gap-4">
                            {item.coverImage ? (
                              <Image 
                                src={item.coverImage} 
                                alt={item.title}
                                width={80}
                                height={120}
                                className="object-cover rounded border border-border"
                              />
                            ) : (
                              <div className="w-20 h-30 bg-secondary/20 rounded border border-border flex items-center justify-center">
                                <BookOpen className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg">{item.title}</h4>
                              <p className="text-muted-foreground">
                                {item.authors?.join(', ') || 'Unknown Author'}
                              </p>
                              {item.downloadCount && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  📥 {item.downloadCount.toLocaleString()} downloads
                                </p>
                              )}
                              <div className="flex flex-wrap gap-2 mt-3">
                                {item.formats['text/html'] && (
                                  <Button
                                    size="sm"
                                    onClick={() => window.open(item.formats['text/html'], '_blank')}
                                  >
                                    <BookOpen className="h-4 w-4 mr-2" />
                                    Read Online
                                  </Button>
                                )}
                                {item.formats['application/epub+zip'] && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(item.formats['application/epub+zip'], '_blank')}
                                  >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Download EPUB
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    }
                    
                    // Open Library Books
                    if (isOpenLibraryBook(item)) {
                      return (
                        <Card key={item.id} className="p-6 hover:border-primary transition-all bg-card/50">
                          <div className="flex gap-4">
                            {item.coverImage ? (
                              <Image 
                                src={item.coverImage} 
                                alt={item.title}
                                width={80}
                                height={120}
                                className="object-cover rounded border border-border"
                              />
                            ) : (
                              <div className="w-20 h-30 bg-secondary/20 rounded border border-border flex items-center justify-center">
                                <Globe className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg">{item.title}</h4>
                              <p className="text-muted-foreground">
                                {item.authors?.join(', ') || 'Unknown Author'}
                              </p>
                              {item.publishYear && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                  <Calendar className="h-3 w-3" />
                                  {item.publishYear}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-2 mt-3">
                                <Button
                                  size="sm"
                                  onClick={() => window.open(`https://openlibrary.org${item.openLibraryId}`, '_blank')}
                                >
                                  <BookOpen className="h-4 w-4 mr-2" />
                                  View on Open Library
                                </Button>
                                {item.hasFulltext && item.ia && item.ia.length > 0 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(`https://archive.org/details/${item.ia![0]}`, '_blank')}
                                  >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Read on Archive.org
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    }
                    
                    // Library Books (user uploads)
                    if (isLibraryBook(item)) {
                      return (
                        <Card key={item.id} className="p-6 hover:border-primary transition-all bg-card/50">
                          <div className="flex gap-4">
                            <div className="w-20 h-30 bg-secondary/20 rounded border border-border flex items-center justify-center">
                              <Book className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-lg">{item.title}</h4>
                              <p className="text-muted-foreground flex items-center gap-1">
                                <User className="h-4 w-4" />
                                {item.author}
                              </p>
                              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(item.createdAt).toLocaleDateString()}
                              </p>
                              <div className="flex gap-2 mt-3">
                                <Button
                                  size="sm"
                                  onClick={() => window.open(item.fileUrl, '_blank')}
                                >
                                  <BookOpen className="h-4 w-4 mr-2" />
                                  Open
                                </Button>
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    }
                    
                    return null;
                  })}
                </div>
                
                {/* Loading more indicator */}
                {loadingMore && (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Book className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTab === 'openlibrary' && !search.trim() 
                    ? 'Enter a search term to browse Open Library'
                    : search 
                      ? `No results found for "${search}"`
                      : 'Browse books from the selected source'}
                </p>
              </div>
            )}
          </div>
        )}

        {!search && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {POPULAR_CATEGORIES.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).map((category) => (
                  <Card 
                    key={category.id} 
                    className="group cursor-pointer hover:border-primary transition-all hover:shadow-[0_0_15px_rgba(var(--primary),0.3)] bg-card/50"
                    onClick={() => handleCategoryClick(category.id)}
                  >
                      <CardContent className="flex flex-col items-center justify-center p-4 sm:p-6 h-32 sm:h-40">
                          <span className="text-3xl sm:text-4xl mb-2 sm:mb-3 transform group-hover:scale-110 transition-transform">{category.icon}</span>
                          <span className="font-bold text-center text-xs sm:text-sm">{category.name}</span>
                      </CardContent>
                  </Card>
              ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
