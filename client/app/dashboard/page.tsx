'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { getToken } from '../../lib/auth';
import MainLayout from '../../components/MainLayout';
import { 
  Typography, 
  Button, 
  Container, 
  Card, 
  CardContent, 
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Fab,
  Box,
  Chip,
  Divider,
  Stack,
  Alert,
  Skeleton
} from '@mui/material';
import Grid from '@mui/material/Grid';

export const dynamic = 'force-dynamic';

const AddIcon = () => <span style={{ fontSize: '1.5rem' }}>+</span>;
const LiveIcon = () => <Box sx={{ width: 8, height: 8, bgcolor: '#ef4444', borderRadius: '50%', mr: 1, boxShadow: '0 0 8px #ef4444' }} />;

interface Room {
  id: string;
  name: string;
  description: string;
  host: { name: string };
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

export default function Dashboard() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [mounted, setMounted] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [roomsRes, genresRes] = await Promise.all([
        api('/rooms'),
        api('/rooms/genres')
      ]);
      
      if (!roomsRes.ok || !genresRes.ok) throw new Error("Link synchronization failed.");

      const roomsData = await roomsRes.json();
      const genresData = await genresRes.json();
      
      setRooms(roomsData);
      setGenres(genresData);
    } catch (err: any) {
      setError(err.message || 'Neural connection lost.');
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

  if (!mounted) return null;

  const handleCreateRoom = async () => {
    try {
      const res = await api('/rooms', {
        method: 'POST',
        body: JSON.stringify({ name: newRoomName, description: newRoomDesc, genreId: selectedGenre })
      });
      if (res.ok) {
        setOpen(false);
        setNewRoomName('');
        setNewRoomDesc('');
        setSelectedGenre('');
        fetchData();
      }
    } catch (e) {}
  };

  return (
    <MainLayout>
      <Container maxWidth="xl">
        {/* Header Section */}
        <Box sx={{ mb: 8 }}>
          <Typography variant="overline" color="primary.main" sx={{ letterSpacing: 4, fontWeight: 'bold' }}>
            SYSTEM_STATUS: OPERATIONAL // 18+ ADULT_ACCESS_ENABLED
          </Typography>
          <Typography variant="h2" className="neon-text" sx={{ fontWeight: 900, mb: 1, color: 'white' }}>
            LIBRARY_ARCHIVES
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600 }}>
            Synchronize with live literary transmissions or explore the deep-data genre modules.
          </Typography>
        </Box>

        {loading ? (
          <Grid container spacing={4}>
            {[1,2,3].map(i => <Grid item xs={12} md={4} key={i}><Skeleton variant="rectangular" height={300} sx={{ bgcolor: '#111' }} /></Grid>)}
          </Grid>
        ) : (
          <>
            {/* Phase 1: Genre Discovery Grid (Book Style) */}
            <Box sx={{ mb: 10 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-end" sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.light' }}>GENRE_VOLUMES</Typography>
                <Typography variant="caption" color="text.secondary">TOTAL_MODULES: {genres.length}</Typography>
              </Stack>
              
              <Grid container spacing={3}>
                {genres.map((genre) => (
                  <Grid item xs={6} sm={4} md={3} lg={2} key={genre.id}>
                    <Box 
                      onClick={() => {}} // Future: filter by genre
                      sx={{ 
                        position: 'relative', height: 280, borderRadius: '4px 12px 12px 4px', 
                        cursor: 'pointer', transition: 'all 0.3s ease',
                        borderLeft: '8px solid', borderColor: genre.isAdult ? 'error.main' : 'secondary.main',
                        background: 'linear-gradient(90deg, #1a1a1a 0%, #0a0a0a 100%)',
                        boxShadow: '10px 10px 20px rgba(0,0,0,0.5)',
                        '&:hover': { transform: 'translateY(-10px) rotateY(-5deg)', boxShadow: `0 0 30px ${genre.isAdult ? 'rgba(239, 68, 68, 0.3)' : 'rgba(217, 70, 239, 0.3)'}` }
                      }}
                    >
                      <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1.2, color: 'white' }}>
                            {genre.name.split(' ').map(w => <div key={w}>{w.toUpperCase()}</div>)}
                          </Typography>
                          {genre.isAdult && <Chip label="18+" size="small" sx={{ mt: 1, height: 16, fontSize: '0.6rem', bgcolor: 'error.main' }} />}
                        </Box>
                        <Box>
                          <Typography variant="caption" color="primary.main" sx={{ fontWeight: 'bold' }}>
                            {genre._count.rooms} ACTIVE_LINKS
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>

            <Grid container spacing={6}>
              {/* Left Column: Live Transmissions */}
              <Grid item xs={12} lg={8}>
                <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold', color: 'error.main' }}>LIVE_TRANSMISSIONS</Typography>
                <Stack spacing={3}>
                  {rooms.map((room) => (
                    <Card key={room.id} sx={{ 
                      display: 'flex', bgcolor: '#050505', border: '1px solid #222',
                      '&:hover': { borderColor: 'primary.main', bgcolor: '#0a0a0a' }
                    }}>
                      <Box sx={{ width: 120, bgcolor: room.genre?.isAdult ? 'error.dark' : 'primary.dark', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
                         <Typography variant="h2" sx={{ opacity: 0.2, fontWeight: 900 }}>{room.name[0]}</Typography>
                      </Box>
                      <CardContent sx={{ flexGrow: 1, py: 3 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Box>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                              <LiveIcon />
                              <Typography variant="caption" color="error" sx={{ fontWeight: 'bold' }}>FREQUENCY_ACTIVE</Typography>
                            </Stack>
                            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>{room.name}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{room.description}</Typography>
                            <Stack direction="row" spacing={1}>
                              <Chip label={room.genre?.name} size="small" variant="outlined" />
                              <Chip label={`${room._count.participants} LISTENERS`} size="small" sx={{ color: 'primary.main' }} />
                            </Stack>
                          </Box>
                          <Button variant="contained" onClick={() => router.push(`/room/${room.id}`)} sx={{ borderRadius: 0, px: 4 }}>JACK_IN</Button>
                        </Stack>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </Grid>

              {/* Right Column: AI Neural Feed (Phase 1 Placeholder) */}
              <Grid item xs={12} lg={4}>
                <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold', color: 'secondary.main' }}>NEURAL_FEED</Typography>
                <Paper sx={{ p: 3, bgcolor: '#0a0a0a', border: '1px dashed #333', textAlign: 'center', height: 500, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                   <Typography variant="h6" className="neon-text" gutterBottom>AI_MODERATION_ONLINE</Typography>
                   <Typography variant="body2" color="text.secondary">
                     Scanning real-time audio streams for key themes and safety compliance...
                   </Typography>
                   <Box sx={{ mt: 4, p: 2, border: '1px solid #222', textAlign: 'left', bgcolor: '#000' }}>
                      <Typography variant="caption" sx={{ color: 'primary.main', display: 'block', mb: 1 }}>[SIGNAL_DETECTED]</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Analyzing "Cyberpunk Noir Live Hub" session. Theme: Radical transhumanism in erotic fiction. Status: Safe.
                      </Typography>
                   </Box>
                   <Box sx={{ mt: 2, p: 2, border: '1px solid #222', textAlign: 'left', bgcolor: '#000', opacity: 0.5 }}>
                      <Typography variant="caption" sx={{ color: 'secondary.main', display: 'block', mb: 1 }}>[SIGNAL_QUEUED]</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Awaiting next data burst from neural network...
                      </Typography>
                   </Box>
                </Paper>
              </Grid>
            </Grid>
          </>
        )}
      </Container>

      <Fab 
        color="primary" 
        sx={{ position: 'fixed', bottom: 32, right: 32, boxShadow: '0 0 20px rgba(217, 70, 239, 0.4)' }}
        onClick={() => setOpen(true)}
      >
        <AddIcon />
      </Fab>

      {/* Creation Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ color: 'primary.main', fontWeight: 'bold' }}>INITIALIZE TRANSMISSION</DialogTitle>
        <DialogContent>
          <TextField autoFocus margin="dense" label="Transmission Name" fullWidth variant="outlined"
            value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} sx={{ mb: 2, mt: 1 }} />
          <TextField select label="Genre Module" fullWidth value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)} SelectProps={{ native: true }} sx={{ mb: 2 }}>
            <option value="">Select Genre...</option>
            {genres.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </TextField>
          <TextField margin="dense" label="Description" fullWidth variant="outlined" multiline rows={2}
            value={newRoomDesc} onChange={(e) => setNewRoomDesc(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpen(false)} color="inherit">ABORT</Button>
          <Button onClick={handleCreateRoom} variant="contained">EXECUTE</Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
}
