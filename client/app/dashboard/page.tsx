'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { getToken } from '../../lib/auth';
import MainLayout from '../../components/MainLayout';
import { searchBooks, GoogleBook } from '../../lib/google-books';
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
  Paper,
  IconButton,
  InputAdornment
} from '@mui/material';
import Grid from '@mui/material/Grid';

export const dynamic = 'force-dynamic';

const AddIcon = () => <span style={{ fontSize: '1.5rem' }}>+</span>;
const SearchIcon = () => <span>🔍</span>;
const BackIcon = () => <span>←</span>;
const LiveIcon = () => <Box sx={{ width: 8, height: 8, bgcolor: '#ef4444', borderRadius: '50%', mr: 1, boxShadow: '0 0 8px #ef4444' }} />;

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
  
  // Room Creation State
  const [open, setOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
    const [selectedGenre, setSelectedGenre] = useState('');
    const [selectedBook, setSelectedBook] = useState<GoogleBook | null>(null);
    
    const [mounted, setMounted] = useState(false);
  // ...
    const handleDiscussBook = (book: GoogleBook) => {
      setNewRoomName(`Reading: ${book.volumeInfo.title}`);
      setNewRoomDesc(`Discussion room for "${book.volumeInfo.title}" by ${book.volumeInfo.authors?.join(', ')}. Join us to read and discuss!`);
      setSelectedBook(book); // Store selected book
      setOpen(true);
    };
  
    const handleCreateRoom = async () => {
      try {
        const body: any = { 
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
                // Genre Grid
                <Box sx={{ mb: 10 }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.light', mb: 4 }}>SELECT_GENRE_MODULE</Typography>
                  <Grid container spacing={2}>
                    {genres.map((genre) => (
                      <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={genre.id}>
                        <Box 
                          onClick={() => handleGenreClick(genre)}
                          sx={{ 
                            position: 'relative', height: 200, borderRadius: '4px', 
                            cursor: 'pointer', transition: 'all 0.2s ease',
                            border: '1px solid #333',
                            bgcolor: '#0a0a0a',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            textAlign: 'center', p: 2,
                            '&:hover': { 
                                borderColor: 'primary.main', 
                                boxShadow: '0 0 20px rgba(0, 243, 255, 0.2)',
                                transform: 'scale(1.02)'
                            }
                          }}
                        >
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 900, color: 'white' }}>{genre.name.toUpperCase()}</Typography>
                                {genre.isAdult && <Chip label="18+" size="small" sx={{ mt: 1, height: 16, fontSize: '0.6rem', bgcolor: 'error.main' }} />}
                            </Box>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
            ) : (
                // Book Grid
                <Box sx={{ mb: 10 }}>
                    <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
                        <Button startIcon={<BackIcon />} onClick={() => setViewMode('genres')} color="inherit">BACK</Button>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'secondary.light' }}>
                            {activeGenreName.toUpperCase()}
                        </Typography>
                    </Stack>
                    
                    <Grid container spacing={3}>
                        {bookList.map((book) => (
                            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={book.id}>
                                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#050505', border: '1px solid #222' }}>
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
                                        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                                            {book.volumeInfo.authors?.join(', ') || 'Unknown Author'}
                                        </Typography>
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
