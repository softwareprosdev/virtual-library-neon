'use client';

import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#d946ef', // Neon Fuchsia/Purple
      light: '#f0abfc',
      dark: '#86198f',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#ec4899', // Neon Pink
      light: '#fbcfe8',
      dark: '#be185d',
      contrastText: '#ffffff',
    },
    background: {
      default: '#000000', // Super Black
      paper: '#0a0a0a',   // Slightly lighter for cards
    },
    text: {
      primary: '#f8fafc', // White-ish
      secondary: '#cbd5e1', // Light Gray
    },
    action: {
      hover: 'rgba(217, 70, 239, 0.08)',
    },
  },
  shape: {
    borderRadius: 12,
  },
  typography: {
    fontFamily: 'var(--font-geist-sans), Inter, sans-serif',
    h1: { fontWeight: 800, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.01em' },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 700, letterSpacing: '0.02em' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#000000',
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#000000',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#333333',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#d946ef',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          padding: '10px 24px',
          transition: 'all 0.2s ease-in-out',
        },
        containedPrimary: {
          background: 'linear-gradient(45deg, #d946ef 30%, #ec4899 90%)',
          boxShadow: '0 0 10px rgba(217, 70, 239, 0.5)',
          '&:hover': {
            boxShadow: '0 0 20px rgba(217, 70, 239, 0.7)',
            transform: 'scale(1.02)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#0a0a0a',
          border: '1px solid #333',
          backgroundImage: 'none',
          transition: 'all 0.3s ease',
          '&:hover': {
            borderColor: '#d946ef',
            boxShadow: '0 0 15px rgba(217, 70, 239, 0.2)',
            transform: 'translateY(-4px)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: '#333',
            },
            '&:hover fieldset': {
              borderColor: '#d946ef',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#ec4899',
            },
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#000000', // Solid black
          borderBottom: '1px solid #333',
          backgroundImage: 'none', // Remove default MUI dark mode gradient
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#000000',
          borderRight: '1px solid #333',
        },
      },
    },
  },
});

export default theme;
