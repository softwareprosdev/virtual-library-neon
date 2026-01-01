'use client';

import { useEffect, useState, useRef } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
  LayoutContextProvider
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Box, CircularProgress, Typography, Button, Stack, IconButton, Paper } from '@mui/material';
import { api } from '../lib/api';
import CyberpunkAudioVisualizer from './CyberpunkAudioVisualizer';

interface LiveAudioProps {
  roomId: string;
}

export default function LiveAudio({ roomId }: LiveAudioProps) {
  const [token, setToken] = useState<string | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fetch Token
  useEffect(() => {
    (async () => {
      try {
        const resp = await api(`/livekit/token?roomId=${roomId}`);
        const data = await resp.json();
        setToken(data.token);
      } catch (e) {
        console.error("LiveKit Token Error:", e);
      }
    })();
  }, [roomId]);

  // Handle Preview Stream
  useEffect(() => {
    if (isJoined) {
      // Stop preview stream when joined
      if (previewStream) {
        previewStream.getTracks().forEach(track => track.stop());
        setPreviewStream(null);
      }
      return;
    }

    let localStream: MediaStream | null = null;

    const startPreview = async () => {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
        setPreviewStream(localStream);
        if (videoRef.current) {
          videoRef.current.srcObject = localStream;
        }
      } catch (e) {
        console.warn("Could not access media devices for preview:", e);
        // Fallback: try to get just audio or just video? 
        // For now, assume user might have denied one or both.
      }
    };

    startPreview();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isJoined]);

  // Toggle tracks on the preview stream
  useEffect(() => {
    if (previewStream) {
      previewStream.getVideoTracks().forEach(track => track.enabled = videoEnabled);
      previewStream.getAudioTracks().forEach(track => track.enabled = audioEnabled);
    }
  }, [previewStream, videoEnabled, audioEnabled]);


  const handleJoin = () => {
    setIsJoined(true);
  };

  if (!token) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', bgcolor: 'black' }}>
        <CircularProgress color="primary" />
        <Typography variant="caption" sx={{ mt: 2, color: 'primary.main' }} className="neon-text">ESTABLISHING_NEURAL_LINK...</Typography>
      </Box>
    );
  }

  if (!isJoined) {
    return (
      <Box sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        bgcolor: 'black',
        p: 3,
        gap: 3
      }}>
        <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 'bold', letterSpacing: 2 }}>
          SYSTEM_CHECK
        </Typography>

        <Box sx={{ position: 'relative', width: '100%', maxWidth: 480, aspectRatio: '16/9', bgcolor: '#111', border: '1px solid #333' }}>
            {/* Video Preview */}
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover',
                    opacity: videoEnabled ? 1 : 0,
                    transition: 'opacity 0.3s'
                }} 
            />
            
            {/* Overlay if video disabled */}
            {!videoEnabled && (
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography sx={{ color: '#555' }}>VIDEO_FEED_OFFLINE</Typography>
                </Box>
            )}

            {/* Audio Visualizer Overlay */}
            <Box sx={{ position: 'absolute', bottom: 10, left: 10, zIndex: 10 }}>
                {audioEnabled ? (
                    <CyberpunkAudioVisualizer stream={previewStream} width={150} height={40} />
                ) : (
                    <Typography variant="caption" sx={{ color: 'error.main', bgcolor: 'rgba(0,0,0,0.8)', px: 1 }}>MUTE</Typography>
                )}
            </Box>
        </Box>

        <Stack direction="row" spacing={3}>
            <Button 
                variant={videoEnabled ? "contained" : "outlined"} 
                color={videoEnabled ? "primary" : "inherit"}
                onClick={() => setVideoEnabled(!videoEnabled)}
                sx={{ borderRadius: 0, minWidth: 120 }}
            >
                {videoEnabled ? "CAM: ON" : "CAM: OFF"}
            </Button>
            <Button 
                variant={audioEnabled ? "contained" : "outlined"} 
                color={audioEnabled ? "secondary" : "inherit"}
                onClick={() => setAudioEnabled(!audioEnabled)}
                sx={{ borderRadius: 0, minWidth: 120 }}
            >
                {audioEnabled ? "MIC: ON" : "MIC: OFF"}
            </Button>
        </Stack>

        <Button 
            variant="contained" 
            size="large"
            onClick={handleJoin}
            sx={{ 
                mt: 2, 
                px: 6, 
                py: 1.5, 
                fontSize: '1.2rem', 
                bgcolor: '#00f3ff', 
                color: '#000',
                fontWeight: 'bold',
                '&:hover': { bgcolor: '#fff' },
                boxShadow: '0 0 20px rgba(0, 243, 255, 0.5)'
            }}
        >
            ENTER_ROOM
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', position: 'relative' }}>
      <LiveKitRoom
        video={videoEnabled}
        audio={audioEnabled}
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://your-project.livekit.cloud'}
        connect={true}
        style={{ height: '100%', backgroundColor: '#000' }}
      >
        <LayoutContextProvider>
          <div className="lk-video-conference" style={{ height: 'calc(100% - 80px)' }}>
            <div className="lk-video-conference-inner">
              <div className="lk-grid-layout-wrapper">
                <VideoConference />
              </div>
            </div>
          </div>
          
          <Box sx={{ 
            height: 80, 
            bgcolor: '#0a0a0a', 
            borderTop: '1px solid #333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2
          }}>
            <ControlBar variation="minimal" controls={{ camera: true, microphone: true, screenShare: true, leave: true }} />
          </Box>

          <RoomAudioRenderer />
        </LayoutContextProvider>
      </LiveKitRoom>
    </Box>
  );
}