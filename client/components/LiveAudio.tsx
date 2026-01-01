'use client';

import { useEffect, useState } from 'react';
import { 
  LiveKitRoom, 
  VideoConference, 
  RoomAudioRenderer,
  ControlBar,
  useTracks
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import '@livekit/components-styles/dist/index.css';
import { Box, CircularProgress, Typography } from '@mui/material';
import { api } from '../lib/api';

interface LiveAudioProps {
  roomId: string;
}

export default function LiveAudio({ roomId }: LiveAudioProps) {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const resp = await api(`/livekit/token?roomId=${roomId}`);
        const data = await resp.json();
        setToken(data.token);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [roomId]);

  if (!token) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <CircularProgress color="primary" />
        <Typography variant="caption" sx={{ mt: 2, color: 'text.secondary' }}>INITIALIZING_AUDIO_STREAM...</Typography>
      </Box>
    );
  }

  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://your-project.livekit.cloud'}
      connect={true}
      style={{ height: '100%' }}
    >
      <VideoConference />
      <RoomAudioRenderer />
      {/* Custom Control Bar styled for Cyberpunk can be added here */}
    </LiveKitRoom>
  );
}
