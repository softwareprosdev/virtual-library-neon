'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../../lib/api';
import MainLayout from '../../../../components/MainLayout';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Stack, 
  Divider,
  Button,
  CircularProgress
} from '@mui/material';

interface Recap {
  summary: string;
  highlights: string[];
  createdAt: string;
}

export default function RecapPage() {
  const { id: roomId } = useParams() as { id: string };
  const router = useRouter();
  const [recap, setRecap] = useState<Recap | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api(`/ai/recap/${roomId}`);
        if (res.ok) {
          setRecap(await res.json());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [roomId]);

  return (
    <MainLayout>
      <Container maxWidth="md">
        <Box sx={{ mb: 6, textAlign: 'center' }}>
          <Typography variant="overline" color="secondary.main" sx={{ letterSpacing: 4 }}>POST_SESSION_RECAP</Typography>
          <Typography variant="h3" className="neon-text" sx={{ fontWeight: 900, color: 'white' }}>ARCHIVE_SYNTHESIS</Typography>
        </Box>

        {loading ? (
          <Box sx={{ textAlign: 'center', py: 10 }}><CircularProgress /></Box>
        ) : !recap ? (
          <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#0a0a0a', border: '1px dashed #333' }}>
            <Typography color="text.secondary">No synthesis data detected for this frequency.</Typography>
            <Button onClick={() => router.push('/dashboard')} sx={{ mt: 2 }}>Return to Hub</Button>
          </Paper>
        ) : (
          <Stack spacing={4}>
            {/* AI Summary */}
            <Paper sx={{ p: 4, borderLeft: '4px solid', borderColor: 'primary.main', bgcolor: '#050505' }}>
              <Typography variant="h6" color="primary.main" gutterBottom sx={{ fontWeight: 'bold' }}>NEURAL_SUMMARY</Typography>
              <Typography variant="body1" sx={{ lineHeight: 1.8, color: 'text.primary' }}>
                {recap.summary}
              </Typography>
            </Paper>

            {/* AI Highlights */}
            <Paper sx={{ p: 4, bgcolor: '#0a0a0a', border: '1px solid #222' }}>
              <Typography variant="h6" color="secondary.main" gutterBottom sx={{ fontWeight: 'bold' }}>SESSION_HIGHLIGHTS</Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
                {recap.highlights.map((point, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    <Typography color="secondary.main" sx={{ fontWeight: 'bold' }}>[0{i+1}]</Typography>
                    <Typography variant="body2" color="text.secondary">{point}</Typography>
                  </Box>
                ))}
              </Stack>
            </Paper>

            <Box sx={{ textAlign: 'center' }}>
               <Button variant="contained" onClick={() => router.push('/dashboard')}>DISCONNECT_LINK</Button>
            </Box>
          </Stack>
        )}
      </Container>
    </MainLayout>
  );
}
