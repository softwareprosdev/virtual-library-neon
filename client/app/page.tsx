'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import { setToken } from '../lib/auth';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  TextField, 
  Typography, 
  Alert,
  Container
} from '@mui/material';

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const body = isLogin ? { email, password } : { email, password, name };

      const res = await api(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      setToken(data.token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'radial-gradient(circle at center, #1a0526 0%, #000000 100%)'
      }}
    >
      <Container maxWidth="xs">
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', color: 'primary.main', textShadow: '0 0 20px rgba(217, 70, 239, 0.5)' }}>
            V-LIBRARY
          </Typography>
          <Typography variant="subtitle1" sx={{ color: 'secondary.light', letterSpacing: 2 }}>
            NEURAL INTERFACE LINK
          </Typography>
        </Box>

        <Card 
          sx={{ 
            bgcolor: 'rgba(10, 10, 10, 0.8)', 
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(217, 70, 239, 0.3)',
            boxShadow: '0 0 40px rgba(0,0,0,0.8)'
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" sx={{ textAlign: 'center', mb: 3, color: 'text.primary' }}>
              {isLogin ? 'AUTHENTICATE' : 'INITIALIZE NEW USER'}
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5' }}>{error}</Alert>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {!isLogin && (
                <TextField
                  label="Identity Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  fullWidth
                  required
                  variant="outlined"
                />
              )}
              <TextField
                label="Email Protocol"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                required
                variant="outlined"
              />
              <TextField
                label="Passkey"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
                required
                variant="outlined"
              />
              
              <Button 
                type="submit" 
                variant="contained" 
                size="large"
                fullWidth
                sx={{ mt: 1, py: 1.5, fontSize: '1.1rem' }}
              >
                {isLogin ? 'JACK IN' : 'REGISTER IDENTITY'}
              </Button>
            </form>

            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Button onClick={() => setIsLogin(!isLogin)} sx={{ color: 'secondary.main' }}>
                {isLogin ? 'NO IDENTITY? REGISTER' : 'HAS IDENTITY? LOGIN'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}