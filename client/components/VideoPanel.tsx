'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, Typography, IconButton, Paper, Button } from '@mui/material';

// Placeholders for icons
const MicIcon = () => <span>🎙️</span>;
const VideocamIcon = () => <span>📹</span>;

interface VideoPanelProps {
  roomId: string;
  socket: {
    on: (event: string, callback: (data: { userId: string, signal: unknown }) => void) => void;
    off: (event: string, callback?: unknown) => void;
    emit: (event: string, data: unknown) => void;
  };
}

export default function VideoPanel({ roomId, socket }: VideoPanelProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remoteStreams] = useState<{ [key: string]: MediaStream }>({});
  
  const userVideo = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // 1. Get User Media
    const getMedia = async () => {
      try {
        const currentStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(currentStream);
        if (userVideo.current) {
          userVideo.current.srcObject = currentStream;
        }

        socket.on('userJoined', (data: { userId: string }) => {
          console.log('User joined, creating offer...', data.userId);
        });

        socket.on('signal', (data: { userId: string, signal: unknown }) => {
          // Handle incoming WebRTC signal
          console.log('Received signal', data.signal);
        });
      } catch (err: unknown) {
        console.error("Media Access Error:", err);
        if (err instanceof Error && err.name === 'NotAllowedError') {
          setError("Camera/Mic access denied. Please enable permissions in your browser settings to use video features.");
        } else {
          setError("Could not access camera or microphone. Please check your hardware.");
        }
      }
    };

    getMedia();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      socket.off('userJoined');
      socket.off('signal');
    };
  }, [roomId, socket, stream]);

  if (error) {
    return (
      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4, textAlign: 'center' }}>
        <Paper sx={{ p: 4, bgcolor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', maxWidth: 400 }}>
          <Typography variant="h6" color="error" gutterBottom>PERMISSION REQUIRED</Typography>
          <Typography variant="body2" sx={{ mb: 3 }}>{error}</Typography>
          <Button variant="outlined" color="error" onClick={() => window.location.reload()}>Retry Connection</Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {/* Local Video */}
        <Paper sx={{ width: 300, height: 225, bgcolor: '#000', position: 'relative', overflow: 'hidden', border: '1px solid #d946ef' }}>
          <video playsInline muted ref={userVideo} autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <Box sx={{ position: 'absolute', bottom: 8, left: 8, bgcolor: 'rgba(0,0,0,0.5)', px: 1, borderRadius: 1 }}>
            <Typography variant="caption" color="white">YOU (Local)</Typography>
          </Box>
        </Paper>

        {/* Remote Videos */}
        {Object.keys(remoteStreams).map(id => (
           <Paper key={id} sx={{ width: 300, height: 225, bgcolor: '#000', border: '1px solid #ec4899' }}>
              <video playsInline autoPlay ref={el => { if(el) el.srcObject = remoteStreams[id] }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
           </Paper>
        ))}
      </Box>

      <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'center', gap: 2 }}>
        <IconButton sx={{ bgcolor: 'background.paper', border: '1px solid #333' }}><MicIcon /></IconButton>
        <IconButton sx={{ bgcolor: 'background.paper', border: '1px solid #333' }}><VideocamIcon /></IconButton>
      </Box>
    </Box>
  );
}
