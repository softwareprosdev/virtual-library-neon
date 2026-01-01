'use client';

import { useEffect, useState } from 'react';
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
  IconButton
} from '@mui/material';
import Grid from '@mui/material/Grid';

export const dynamic = 'force-dynamic';

const AddIcon = () => <span style={{ fontSize: '1.5rem' }}>+</span>;
const BookIcon = () => <span>📖</span>;
const DeleteIcon = () => <span>🗑️</span>;

interface Book {
  id: string;
  title: string;
  author: string | null;
  fileType: string | null;
  fileUrl: string | null;
}

export default function LibraryPage() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push('/');
      return;
    }
    fetchBooks();
  }, [router]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery) {
        handleSearch();
      } else {
        fetchBooks();
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const fetchBooks = async () => {
    try {
      const res = await api('/books');
      if (res.ok) {
        const data = await res.json();
        setBooks(data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSearch = async () => {
    try {
      const res = await api(`/books/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setBooks(data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('author', author);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/books/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getToken()}`
        },
        body: formData
      });

      if (res.ok) {
        setOpen(false);
        setFile(null);
        setTitle('');
        setAuthor('');
        fetchBooks();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this archive permanently?")) return;
    try {
      const res = await api(`/books/${id}`, { method: 'DELETE' });
      if (res.ok) fetchBooks();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <MainLayout>
      <Container maxWidth="xl">
        <Box sx={{ mb: 6, textAlign: 'center' }}>
          <Typography variant="h2" component="h1" gutterBottom className="neon-text" sx={{ color: 'white' }}>
            MY ARCHIVES
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Manage your synchronized knowledge modules
          </Typography>
          <Box sx={{ mt: 4, maxWidth: 600, mx: 'auto' }}>
             <TextField
               fullWidth
               label="Search Archives (Content & Metadata)"
               variant="outlined"
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               sx={{ 
                 '& .MuiOutlinedInput-root': { 
                   color: 'white',
                   '& fieldset': { borderColor: '#333' },
                   '&:hover fieldset': { borderColor: '#00ff41' },
                 },
                 '& .MuiInputLabel-root': { color: '#666' }
               }}
             />
          </Box>
        </Box>

        <Grid container spacing={4}>
          {books.map((book) => (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={book.id}>
              <Card sx={{ height: '100%', position: 'relative' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <BookIcon />
                    <Typography variant="h6" sx={{ color: 'secondary.main', fontWeight: 'bold' }}>
                      {book.title}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    By: {book.author || 'Unknown'}
                  </Typography>
                  {book.fileType && (
                    <Chip 
                      label={book.fileType.toUpperCase()} 
                      size="small" 
                      sx={{ mt: 2, bgcolor: 'primary.dark', color: 'primary.light' }} 
                    />
                  )}
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', p: 2 }}>
                  <Button 
                    variant="outlined" 
                    size="small"
                    onClick={() => book.fileUrl && router.push(`/read/${book.id}`)}
                    disabled={!book.fileUrl}
                  >
                    Read
                  </Button>
                  <IconButton color="error" onClick={() => handleDelete(book.id)}>
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      <Fab 
        color="secondary" 
        sx={{ position: 'fixed', bottom: 32, right: 32 }}
        onClick={() => setOpen(true)}
      >
        <AddIcon />
      </Fab>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ color: 'primary.main' }}>UPLOAD ARCHIVE</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <input 
              type="file" 
              accept=".pdf,.epub" 
              onChange={(e) => setFile(e.target.files?.[0] || null)} 
              style={{ color: 'white' }}
            />
            <TextField 
              label="Archive Title" 
              fullWidth 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
            />
            <TextField 
              label="Author/Source" 
              fullWidth 
              value={author} 
              onChange={(e) => setAuthor(e.target.value)} 
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpen(false)} color="inherit">Abort</Button>
          <Button 
            onClick={handleUpload} 
            variant="contained" 
            disabled={!file || isUploading}
          >
            {isUploading ? 'Uploading...' : 'Synchronize'}
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
}
