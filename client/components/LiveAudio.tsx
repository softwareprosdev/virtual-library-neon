'use client';

import { useEffect, useState } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
  LayoutContextProvider
} from '@livekit/components-react';
import '@livekit/components-styles';
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
        console.error("LiveKit Token Error:", e);
      }
    })();
  }, [roomId]);

  if (!token) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', bgcolor: 'black' }}>
        <CircularProgress color="primary" />
        <Typography variant="caption" sx={{ mt: 2, color: 'primary.main' }} className="neon-text">ESTABLISHING_NEURAL_LINK...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', position: 'relative' }}>
      <LiveKitRoom
        video={true}
        audio={true}
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
          
          {/* Enhanced Control Bar */}
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