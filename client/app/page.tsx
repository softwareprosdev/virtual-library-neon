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
  Container,
  FormControlLabel,
  Checkbox
} from '@mui/material';

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [ageVerified, setAgeVerified] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isLogin && !ageVerified) {
      setError('You must confirm you are 18 or older');
      return;
    }

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const body = isLogin ? { email, password } : { email, password, name, ageVerified };

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
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
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
            ADULT NEURAL INTERFACE (18+)
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
              {isLogin ? 'AUTHENTICATE' : 'INITIALIZE MATURE ACCOUNT'}
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

              {!isLogin && (
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={ageVerified} 
                      onChange={(e) => setAgeVerified(e.target.checked)} 
                      sx={{ color: 'primary.main' }}
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      I certify that I am at least 18 years of age and agree to view mature content.
                    </Typography>
                  }
                />
              )}
              
              <Button 
                type="submit" 
                variant="contained" 
                size="large"
                fullWidth
                sx={{ mt: 1, py: 1.5, fontSize: '1.1rem' }}
              >
                {isLogin ? 'JACK IN' : 'CONFIRM ADULT ACCESS'}
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