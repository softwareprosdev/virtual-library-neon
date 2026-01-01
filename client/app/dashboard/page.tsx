'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { getToken } from '../../lib/auth';
import MainLayout from '../../components/MainLayout';
import { searchBooks, getTrendingBooks, getNewReleases, GoogleBook } from '../../lib/google-books';
import type { FormEvent } from 'react';
import {
  Typography,
  Button,
  Container,
  Card,
  CardContent,
  CardMedia,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Fab,
  Box,
  Chip,
  Stack,
  Skeleton,
  IconButton,
  InputAdornment
} from '@mui/material';
import Grid from '@mui/material/Grid';

export const dynamic = 'force-dynamic';

const AddIcon = () => <span style={{ fontSize: '1.5rem' }}>+</span>;
const SearchIcon = () => <span>🔍</span>;
const BackIcon = () => <span>←</span>;
const FireIcon = () => <span>🔥</span>;
const NewIcon = () => <span>✨</span>;
const BookIcon = () => <span>📚</span>;

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
      if (!bookListRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      if (scrollTop + clientHeight >= scrollHeight - 500) {
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
      <Container maxWidth="xl">
        {/* Header Section */}
        <Box sx={{ mb: 6 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
                <Typography variant="overline" color="primary.main" sx={{ letterSpacing: 4, fontWeight: 'bold' }}>
                    SYSTEM_STATUS: OPERATIONAL // BOOK_DB_ONLINE
                </Typography>
                <Typography variant="h2" className="neon-text" sx={{ fontWeight: 900, mb: 1, color: 'white' }}>
                    LITERARY_NEXUS
                </Typography>
            </Box>
            <form onSubmit={handleSearch}>
                <TextField 
                    placeholder="SEARCH_DATABASE..." 
                    variant="outlined" 
                    size="small"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    sx={{ 
                        width: 300, 
                        '& .MuiOutlinedInput-root': { bgcolor: '#050505', color: 'white' } 
                    }}
                    slotProps={{
                        input: {
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton type="submit" edge="end" sx={{ color: 'primary.main' }}>
                                        <SearchIcon />
                                    </IconButton>
                                </InputAdornment>
                            )
                        }
                    }}
                />
            </form>
          </Stack>
        </Box>

        {loading ? (
          <Grid container spacing={4}>
            {[1,2,3,4].map(i => <Grid size={{ xs: 12, md: 3 }} key={i}><Skeleton variant="rectangular" height={300} sx={{ bgcolor: '#111' }} /></Grid>)}
          </Grid>
        ) : (
          <>
            {viewMode === 'genres' ? (
              <>
                {/* Trending Books Section */}
                {trendingBooks.length > 0 && (
                  <Box sx={{ mb: 6 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                      <FireIcon />
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'error.light' }}>TRENDING_NOW</Typography>
                    </Stack>
                    <Stack direction="row" spacing={2} sx={{ overflowX: 'auto', pb: 2 }}>
                      {trendingBooks.map((book) => (
                        <Card key={book.id} sx={{ minWidth: 180, maxWidth: 180, bgcolor: '#050505', border: '1px solid #333', flexShrink: 0 }}>
                          {book.volumeInfo.imageLinks?.thumbnail && (
                            <CardMedia
                              component="img"
                              height="200"
                              image={book.volumeInfo.imageLinks.thumbnail.replace('http:', 'https:')}
                              alt={book.volumeInfo.title}
                              sx={{ objectFit: 'contain', bgcolor: '#000', pt: 1 }}
                            />
                          )}
                          <CardContent sx={{ p: 1.5 }}>
                            <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold', display: 'block', lineHeight: 1.2, mb: 0.5 }} noWrap>
                              {book.volumeInfo.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {book.volumeInfo.authors?.[0] || 'Unknown'}
                            </Typography>
                            <Button size="small" variant="outlined" color="primary" fullWidth sx={{ mt: 1, fontSize: '0.65rem' }} onClick={() => handleDiscussBook(book)}>
                              DISCUSS
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  </Box>
                )}

                {/* New Releases Section */}
                {newReleases.length > 0 && (
                  <Box sx={{ mb: 6 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                      <NewIcon />
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'secondary.light' }}>NEW_RELEASES</Typography>
                    </Stack>
                    <Stack direction="row" spacing={2} sx={{ overflowX: 'auto', pb: 2 }}>
                      {newReleases.map((book) => (
                        <Card key={book.id} sx={{ minWidth: 180, maxWidth: 180, bgcolor: '#050505', border: '1px solid #333', flexShrink: 0 }}>
                          {book.volumeInfo.imageLinks?.thumbnail && (
                            <CardMedia
                              component="img"
                              height="200"
                              image={book.volumeInfo.imageLinks.thumbnail.replace('http:', 'https:')}
                              alt={book.volumeInfo.title}
                              sx={{ objectFit: 'contain', bgcolor: '#000', pt: 1 }}
                            />
                          )}
                          <CardContent sx={{ p: 1.5 }}>
                            <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold', display: 'block', lineHeight: 1.2, mb: 0.5 }} noWrap>
                              {book.volumeInfo.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {book.volumeInfo.authors?.[0] || 'Unknown'}
                            </Typography>
                            <Button size="small" variant="outlined" color="secondary" fullWidth sx={{ mt: 1, fontSize: '0.65rem' }} onClick={() => handleDiscussBook(book)}>
                              DISCUSS
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  </Box>
                )}

                {/* Popular Categories */}
                <Box sx={{ mb: 6 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                    <BookIcon />
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.light' }}>BROWSE_BY_CATEGORY</Typography>
                  </Stack>
                  <Grid container spacing={2}>
                    {POPULAR_CATEGORIES.map((category) => (
                      <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={category.id}>
                        <Box
                          onClick={() => handleCategoryClick(category)}
                          sx={{
                            position: 'relative', height: 120, borderRadius: '4px',
                            cursor: 'pointer', transition: 'all 0.2s ease',
                            border: '1px solid #333',
                            bgcolor: '#0a0a0a',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexDirection: 'column',
                            textAlign: 'center', p: 2,
                            '&:hover': {
                              borderColor: 'primary.main',
                              boxShadow: '0 0 20px rgba(0, 243, 255, 0.2)',
                              transform: 'scale(1.02)'
                            }
                          }}
                        >
                          <Typography sx={{ fontSize: '2rem', mb: 1 }}>{category.icon}</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: 'white' }}>{category.name.toUpperCase()}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>

                {/* Room Genres (from API) */}
                {genres.length > 0 && (
                  <Box sx={{ mb: 6 }}>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'text.secondary', mb: 3 }}>ROOM_GENRES</Typography>
                    <Grid container spacing={2}>
                      {genres.map((genre) => (
                        <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={genre.id}>
                          <Box
                            onClick={() => handleGenreClick(genre)}
                            sx={{
                              position: 'relative', height: 100, borderRadius: '4px',
                              cursor: 'pointer', transition: 'all 0.2s ease',
                              border: '1px solid #222',
                              bgcolor: '#050505',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              textAlign: 'center', p: 2,
                              '&:hover': {
                                borderColor: 'secondary.main',
                                boxShadow: '0 0 15px rgba(217, 70, 239, 0.2)',
                                transform: 'scale(1.02)'
                              }
                            }}
                          >
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 900, color: 'white' }}>{genre.name.toUpperCase()}</Typography>
                              {genre.isAdult && <Chip label="18+" size="small" sx={{ mt: 0.5, height: 14, fontSize: '0.55rem', bgcolor: 'error.main' }} />}
                              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5 }}>{genre._count.rooms} rooms</Typography>
                            </Box>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
              </>
            ) : (
                // Book Grid with Infinite Scroll
                <Box ref={bookListRef} sx={{ mb: 10 }}>
                    <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
                        <Button startIcon={<BackIcon />} onClick={() => setViewMode('genres')} color="inherit">BACK</Button>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'secondary.light' }}>
                            {activeGenreName.toUpperCase()}
                        </Typography>
                        <Chip label={`${bookList.length} books`} size="small" sx={{ ml: 'auto' }} />
                    </Stack>

                    {isSearching && bookList.length === 0 ? (
                      <Grid container spacing={3}>
                        {[1,2,3,4,5,6,7,8].map(i => (
                          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={i}>
                            <Skeleton variant="rectangular" height={350} sx={{ bgcolor: '#111', borderRadius: 1 }} />
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <>
                        <Grid container spacing={3}>
                            {bookList.map((book, index) => (
                                <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={`${book.id}-${index}`}>
                                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#050505', border: '1px solid #222', transition: 'all 0.2s ease', '&:hover': { borderColor: 'primary.main', transform: 'translateY(-4px)' } }}>
                                        {book.volumeInfo.imageLinks?.thumbnail && (
                                            <CardMedia
                                                component="img"
                                                height="240"
                                                image={book.volumeInfo.imageLinks.thumbnail.replace('http:', 'https:')}
                                                alt={book.volumeInfo.title}
                                                sx={{ objectFit: 'contain', bgcolor: '#000', pt: 2 }}
                                            />
                                        )}
                                        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                                            <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 'bold', lineHeight: 1.2, mb: 1 }}>
                                                {book.volumeInfo.title}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                                {book.volumeInfo.authors?.join(', ') || 'Unknown Author'}
                                            </Typography>
                                            {book.volumeInfo.publishedDate && (
                                              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block', opacity: 0.7 }}>
                                                {book.volumeInfo.publishedDate.split('-')[0]}
                                              </Typography>
                                            )}
                                            <Button
                                                variant="outlined"
                                                color="primary"
                                                fullWidth
                                                sx={{ mt: 'auto' }}
                                                onClick={() => handleDiscussBook(book)}
                                            >
                                                START DISCUSSION
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>

                        {/* Load More Indicator */}
                        {loadingMore && (
                          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <Stack direction="row" spacing={2} alignItems="center">
                              <Skeleton variant="circular" width={24} height={24} sx={{ bgcolor: '#333' }} />
                              <Typography variant="body2" color="text.secondary">LOADING_MORE_BOOKS...</Typography>
                            </Stack>
                          </Box>
                        )}

                        {hasMore && !loadingMore && (
                          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <Button variant="outlined" onClick={loadMoreBooks}>
                              LOAD_MORE
                            </Button>
                          </Box>
                        )}

                        {!hasMore && bookList.length > 0 && (
                          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                            <Typography variant="caption" color="text.secondary">END_OF_RESULTS</Typography>
                          </Box>
                        )}
                      </>
                    )}
                </Box>
            )}

            {/* Active Rooms Footer (Always visible for quick access) */}
            <Box sx={{ mt: 8, pt: 4, borderTop: '1px solid #222' }}>
                <Typography variant="h5" sx={{ mb: 3, color: 'text.secondary' }}>ACTIVE_DISCUSSIONS</Typography>
                <Stack direction="row" spacing={2} sx={{ overflowX: 'auto', pb: 2 }}>
                    {rooms.map((room) => (
                        <Card key={room.id} sx={{ minWidth: 280, bgcolor: '#0a0a0a', border: '1px solid #333' }}>
                            <CardContent>
                                <Typography variant="h6" color="primary.main" noWrap>{room.name}</Typography>
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                                    {room._count.participants} LISTENERS
                                </Typography>
                                <Button size="small" variant="contained" onClick={() => router.push(`/room/${room.id}`)}>JOIN</Button>
                            </CardContent>
                        </Card>
                    ))}
                </Stack>
            </Box>
          </>
        )}
      </Container>

      <Fab 
        color="secondary" 
        sx={{ position: 'fixed', bottom: 32, right: 32 }}
        onClick={() => {
            setNewRoomName('');
            setNewRoomDesc('');
            setOpen(true);
        }}
      >
        <AddIcon />
      </Fab>

      {/* Creation Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ color: 'primary.main', fontWeight: 'bold' }}>INITIALIZE DISCUSSION</DialogTitle>
        <DialogContent>
          <TextField autoFocus margin="dense" label="Room Name / Book Title" fullWidth variant="outlined"
            value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} sx={{ mb: 2, mt: 1 }} />
          <TextField select label="Genre Module" fullWidth value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)} SelectProps={{ native: true }} sx={{ mb: 2 }}>
            <option value="">Select Genre...</option>
            {genres.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </TextField>
          <TextField margin="dense" label="Description" fullWidth variant="outlined" multiline rows={3}
            value={newRoomDesc} onChange={(e) => setNewRoomDesc(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpen(false)} color="inherit">ABORT</Button>
          <Button onClick={handleCreateRoom} variant="contained">LAUNCH ROOM</Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
}
