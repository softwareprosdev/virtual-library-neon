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
  Stack
} from '@mui/material';
import Grid from '@mui/material/Grid';

export const dynamic = 'force-dynamic';

const AddIcon = () => <span style={{ fontSize: '1.5rem' }}>+</span>;
const LiveIcon = () => <Box sx={{ width: 10, height: 10, bgcolor: '#ef4444', borderRadius: '50%', mr: 1, boxShadow: '0 0 10px #ef4444' }} />;

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
  const [open, setOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [mounted, setMounted] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      console.log('Fetching discovery data...');
      const [roomsRes, genresRes] = await Promise.all([
        api('/rooms'),
        api('/rooms/genres')
      ]);
      
      const roomsData = await roomsRes.json();
      const genresData = await genresRes.json();
      
      console.log('Rooms received:', roomsData);
      console.log('Genres received:', genresData);

      if (roomsRes.ok) setRooms(roomsData);
      if (genresRes.ok) setGenres(genresData);
    } catch (error) {
      console.error("Discovery Error:", error);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    const token = getToken();
    if (!token) {
      router.push('/');
      return;
    }
    
    const init = async () => {
      await fetchData();
    };
    
    init();
  }, [router, fetchData]);

  if (!mounted) return null;

  const handleCreateRoom = async () => {
    try {
      const res = await api('/rooms', {
        method: 'POST',
        body: JSON.stringify({ 
          name: newRoomName, 
          description: newRoomDesc,
          genreId: selectedGenre
        })
      });
      
      if (res.ok) {
        setOpen(false);
        setNewRoomName('');
        setNewRoomDesc('');
        setSelectedGenre('');
        fetchData();
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <MainLayout>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 6, textAlign: 'left', borderLeft: '4px solid', borderColor: 'primary.main', pl: 2 }}>
          <Typography variant="h3" component="h1" className="neon-text" sx={{ fontWeight: 'bold', letterSpacing: 4 }}>
            DISCOVERY_HUB
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            GENRE_NETWORKS_CONNECTED: {genres.length}
          </Typography>
        </Box>

        {/* Phase 1 Task: Genre Discovery Grid */}
        <Typography variant="h5" sx={{ mb: 3, color: 'secondary.main', fontWeight: 'bold' }}>GENRE MODULES</Typography>
        <Grid container spacing={3} sx={{ mb: 8 }}>
          {genres.map((genre) => (
            <Grid item xs={12} sm={6} md={4} lg={2} key={genre.id}>
              <Card sx={{ 
                bgcolor: 'background.paper', 
                border: '1px solid', 
                borderColor: genre.isAdult ? 'error.dark' : 'primary.dark',
                cursor: 'pointer',
                '&:hover': { transform: 'scale(1.05)', borderColor: genre.isAdult ? 'error.main' : 'primary.main' }
              }}>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>{genre.name.toUpperCase()}</Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {genre._count.rooms} ACTIVE ROOMS
                  </Typography>
                  {genre.isAdult && (
                    <Chip label="18+" size="small" sx={{ mt: 1, bgcolor: 'error.main', color: 'white', fontWeight: 'bold' }} />
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ mb: 6, borderColor: 'rgba(255,255,255,0.1)' }} />

        {/* Phase 1 Task: Live Now Rooms */}
        <Typography variant="h5" sx={{ mb: 3, color: 'primary.main', fontWeight: 'bold' }}>LIVE TRANSMISSIONS</Typography>
        <Grid container spacing={4}>
          {rooms.map((room) => (
            <Grid item xs={12} sm={6} md={4} key={room.id}>
              <Card sx={{ background: 'linear-gradient(145deg, #0a0a0a 0%, #1a1a1a 100%)' }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
                    <LiveIcon />
                    <Typography variant="overline" color="error" sx={{ fontWeight: 'bold' }}>LIVE NOW</Typography>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1, color: 'primary.light' }}>{room.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3, minHeight: 40 }}>
                    {room.description || 'Neural link established. Waiting for metadata...'}
                  </Typography>
                  
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    {room.genre?.isAdult && <Chip label="MATURE" size="small" variant="outlined" color="error" />}
                    <Chip label={room.genre?.name || 'Uncategorized'} size="small" variant="outlined" sx={{ color: 'secondary.light', borderColor: 'secondary.dark' }} />
                  </Stack>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">HOST: {room.host.name}</Typography>
                    <Typography variant="caption" color="primary.main">{room._count.participants} LISTENERS</Typography>
                  </Box>
                </CardContent>
                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button fullWidth variant="contained" onClick={() => router.push(`/room/${room.id}`)}>
                    JOIN_LINK
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      <Fab 
        color="primary" 
        sx={{ position: 'fixed', bottom: 32, right: 32, boxShadow: '0 0 20px rgba(217, 70, 239, 0.4)' }}
        onClick={() => setOpen(true)}
      >
        <AddIcon />
      </Fab>

      {/* Room Creation Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ color: 'primary.main', fontWeight: 'bold' }}>INITIALIZE TRANSMISSION</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus margin="dense" label="Room Name" fullWidth variant="outlined"
            value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            select label="Genre Module" fullWidth value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)} SelectProps={{ native: true }} sx={{ mb: 2 }}
          >
            <option value="">Select Genre...</option>
            {genres.map((g) => (
              <option key={g.id} value={g.id}>{g.name} {g.isAdult ? '(18+)' : ''}</option>
            ))}
          </TextField>
          <TextField
            margin="dense" label="Transmission Description" fullWidth variant="outlined" multiline rows={2}
            value={newRoomDesc} onChange={(e) => setNewRoomDesc(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpen(false)} color="inherit">ABORT</Button>
          <Button onClick={handleCreateRoom} variant="contained">EXECUTE</Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
}