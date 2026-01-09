'use client';

import { useState, useEffect, useCallback } from 'react';
import MainLayout from '../../components/MainLayout';
import { Compass, Search, Book, User, Calendar } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import { api } from '../../lib/api';
import Image from 'next/image';

interface Book {
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
  };
}

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
  const [searchResults, setSearchResults] = useState<(Book | GoogleBook)[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTab, setSearchTab] = useState<'library' | 'google'>('library');
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentQuery, setCurrentQuery] = useState('');
  const [startIndex, setStartIndex] = useState(0);

  // Search user's library
  const searchLibrary = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await api(`/books/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setSearchResults(data.books || []);
    } catch (error) {
      console.error('Library search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Search Google Books API
  const searchGoogleBooks = useCallback(async (query: string, append = false) => {
    if (!query.trim()) {
      setSearchResults([]);
      setStartIndex(0);
      return;
    }

    if (append) {
      setLoadingMore(true);
    } else {
      setIsSearching(true);
      setStartIndex(0);
      setSearchResults([]);
    }

    try {
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20&startIndex=${append ? startIndex : 0}`);
      const data = await response.json();
      const newItems = data.items || [];
      
      if (append) {
        setSearchResults(prev => [...prev, ...newItems]);
      } else {
        setSearchResults(newItems);
      }
      
      setHasMore(data.totalItems > startIndex + newItems.length);
      setStartIndex(prev => prev + newItems.length);
    } catch (error) {
      console.error('Google Books search failed:', error);
      if (!append) setSearchResults([]);
    } finally {
      setIsSearching(false);
      setLoadingMore(false);
    }
  }, [startIndex]);

  // Load more results for infinite scroll
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && currentQuery && searchTab === 'google') {
      searchGoogleBooks(currentQuery, true);
    }
  }, [loadingMore, hasMore, currentQuery, searchTab, searchGoogleBooks]);

  useEffect(() => {
    if (search) {
      setCurrentQuery(search);
      if (searchTab === 'library') {
        searchLibrary(search);
      } else {
        searchGoogleBooks(search);
      }
    } else {
      setSearchResults([]);
      setHasMore(true);
      setStartIndex(0);
    }
  }, [search, searchTab, searchGoogleBooks]);

  // Infinite scroll for Google Books
  useEffect(() => {
    if (searchTab !== 'google' || !hasMore) return;

    const handleScroll = () => {
      const { innerHeight, scrollY } = window;
      const { scrollHeight } = document.body;
      
      if (scrollY + innerHeight >= scrollHeight - 1000) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [searchTab, hasMore, currentQuery, loadMore]);

  const isGoogleBook = (item: Book | GoogleBook): item is GoogleBook => {
    return 'volumeInfo' in item;
  };

  const handleCategoryClick = (categoryId: string) => {
    // For now, filter by category in search
    setSearch(categoryId);
    setSearchTab('library');
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

        {search && (
          <div className="mb-8">
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setSearchTab('library')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  searchTab === 'library' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-card/50 text-muted-foreground hover:bg-card'
                }`}
              >
                My Library
              </button>
              <button
                onClick={() => setSearchTab('google')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  searchTab === 'google' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-card/50 text-muted-foreground hover:bg-card'
                }`}
              >
                Google Books
              </button>
            </div>

            {isSearching ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="mt-2 text-muted-foreground">Searching...</p>
              </div>
            ) : searchResults.length > 0 ? (
                <div className="grid gap-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">
                      {searchResults.length} results found
                    </h3>
                    {hasMore && searchTab === 'google' && (
                      <button
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                      >
                        {loadingMore && (
                          <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin rounded-full" />
                        )}
                        Load More
                      </button>
                    )}
                  </div>
                <div className="grid gap-4">
                  {searchResults.map((item) => {
                    if (isGoogleBook(item)) {
                      return (
                        <Card key={item.id} className="p-6 hover:border-primary transition-all bg-card/50">
                          <div className="flex gap-4">
                            {item.volumeInfo.imageLinks?.thumbnail && (
                              <Image 
                                src={item.volumeInfo.imageLinks.thumbnail} 
                                alt={item.volumeInfo.title}
                                width={64}
                                height={96}
                                className="object-cover rounded"
                              />
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
                            </div>
                          </div>
                        </Card>
                      );
                    } else {
                      return (
                        <Card key={item.id} className="p-6 hover:border-primary transition-all bg-card/50">
                          <div className="flex gap-4">
                            <Book className="h-16 w-16 text-muted-foreground" />
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
                            </div>
                          </div>
                        </Card>
                      );
                    }
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Book className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No results found for &quot;{search}&quot;</p>
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
