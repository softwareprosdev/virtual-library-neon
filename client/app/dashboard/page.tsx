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
  Chip
} from '@mui/material';
import Grid from '@mui/material/Grid';

export const dynamic = 'force-dynamic';

const AddIcon = () => <span style={{ fontSize: '1.5rem' }}>+</span>;
const UserIcon = () => <span>👤</span>;

interface Room {
  id: string;
  name: string;
  description: string;
  host: { name: string };
  category?: { name: string };
  _count: { messages: number };
}

interface Category {
  id: string;
  name: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [selectedCat, setSelectedCat] = useState('');

  const fetchRooms = useCallback(async () => {
    try {
      const res = await api('/rooms');
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api('/rooms/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/');
      return;
    }
    
    const init = async () => {
      await fetchRooms();
      await fetchCategories();
    };
    
    init();
  }, [router, fetchRooms, fetchCategories]);

  const handleCreateRoom = async () => {
    try {
      const res = await api('/rooms', {
        method: 'POST',
        body: JSON.stringify({ 
          name: newRoomName, 
          description: newRoomDesc,
          categoryId: selectedCat
        })
      });
      
      if (res.ok) {
        setOpen(false);
        setNewRoomName('');
        setNewRoomDesc('');
        setSelectedCat('');
        fetchRooms();
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <MainLayout>
      <Container maxWidth="xl">
        <Box sx={{ mb: 6, textAlign: 'center' }}>
          <Typography variant="h2" component="h1" gutterBottom className="neon-text" sx={{ color: 'white' }}>
            DASHBOARD
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Select a neural link to join a session
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {rooms.map((room) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={room.id}>
              <Card 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  background: 'linear-gradient(180deg, rgba(10,10,10,1) 0%, rgba(20,20,20,1) 100%)',
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h5" component="div" gutterBottom sx={{ color: 'primary.main', fontWeight: 'bold' }}>
                    {room.name}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                    <Chip 
                      label="MATURE CONTENT" 
                      size="small" 
                      sx={{ bgcolor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontSize: '0.6rem', border: '1px solid #ef4444' }} 
                    />
                    {room.category && (
                      <Chip 
                        label={room.category.name} 
                        size="small" 
                        sx={{ bgcolor: 'secondary.dark', color: 'white', fontSize: '0.7rem' }} 
                      />
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, color: 'text.secondary', fontSize: '0.8rem' }}>
                    <UserIcon /> <span style={{ marginLeft: 8 }}>{room.host.name}</span>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {room.description || 'No system description available.'}
                  </Typography>
                  <Chip 
                    label={`${room._count.messages} Messages`} 
                    size="small" 
                    variant="outlined" 
                    sx={{ borderColor: 'primary.dark', color: 'primary.light' }} 
                  />
                </CardContent>
                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button 
                    fullWidth 
                    variant="contained" 
                    onClick={() => router.push(`/room/${room.id}`)}
                  >
                    Jack In
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      <Fab 
        color="secondary" 
        aria-label="add" 
        sx={{ 
          position: 'fixed', 
          bottom: 32, 
          right: 32,
          boxShadow: '0 0 20px rgba(236, 72, 153, 0.6)'
        }}
        onClick={() => setOpen(true)}
      >
        <AddIcon />
      </Fab>

      <Dialog 
        open={open} 
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'primary.main',
            boxShadow: '0 0 50px rgba(217, 70, 239, 0.2)'
          }
        }}
      >
        <DialogTitle sx={{ color: 'primary.main', fontWeight: 'bold' }}>INITIALIZE NEW ROOM</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="System Name"
            fullWidth
            variant="outlined"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            select
            label="Category Module"
            fullWidth
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            SelectProps={{ native: true }}
            sx={{ mb: 2 }}
          >
            <option value="">Select Category...</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </TextField>
          <TextField
            margin="dense"
            label="Protocol Description"
            fullWidth
            variant="outlined"
            multiline
            rows={2}
            value={newRoomDesc}
            onChange={(e) => setNewRoomDesc(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpen(false)} color="inherit">Abort</Button>
          <Button onClick={handleCreateRoom} variant="contained">Execute</Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
}
