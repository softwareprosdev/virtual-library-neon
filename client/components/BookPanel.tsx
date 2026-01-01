'use client';

import { Box, Typography, Card, CardMedia, CardContent, Chip } from '@mui/material';

interface Book {
  id: string;
  title: string;
  author?: string;
  coverUrl?: string;
  description?: string;
  isbn?: string;
}

interface BookPanelProps {
  book: Book;
}

export default function BookPanel({ book }: BookPanelProps) {
  return (
    <Card sx={{ 
      display: 'flex', 
      flexDirection: { xs: 'column', md: 'row' }, 
      bgcolor: '#0a0a0a', 
      border: '1px solid #333',
      mb: 2 
    }}>
      {book.coverUrl && (
        <CardMedia
          component="img"
          sx={{ width: { xs: '100%', md: 120 }, height: { xs: 200, md: 'auto' }, objectFit: 'contain', bgcolor: '#000', p: 1 }}
          image={book.coverUrl.replace('http:', 'https:')}
          alt={book.title}
        />
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <CardContent>
          <Typography component="div" variant="h6" color="primary.main" fontWeight="bold">
            {book.title}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" component="div">
            {book.author || 'Unknown Author'}
          </Typography>
          {book.isbn && (
             <Chip label={`ISBN: ${book.isbn}`} size="small" variant="outlined" sx={{ mt: 1, borderColor: '#333', color: '#666' }} />
          )}
          {book.description && (
             <Typography variant="body2" color="text.secondary" sx={{ mt: 2, maxHeight: 100, overflowY: 'auto' }}>
                {book.description}
             </Typography>
          )}
        </CardContent>
      </Box>
    </Card>
  );
}
