'use client';

import { useEffect, useState, useRef } from 'react';
import { Track, RoomEvent, RoomState } from 'livekit-client';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  LayoutContextProvider,
  useLocalParticipant,
  useTracks,
  useRoomContext,
  ParticipantLoop,
  ParticipantContext,
  VideoTrack,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { 
  Box, 
  CircularProgress, 
  Typography, 
  Button, 
  Stack, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  SelectChangeEvent, 
  Grid, 
  Paper, 
  IconButton 
} from '@mui/material';
import { api } from '../lib/api';
import CyberpunkAudioVisualizer from './CyberpunkAudioVisualizer';
import ActiveSpeaker from './ActiveSpeaker';
import { 
  createVideoProcessor, 
  createProcessedAudioStream, 
  VideoEffectType, 
  AudioEffectType 
} from '../lib/media-processors';

interface LiveAudioProps {
  roomId: string;
}

// --- Custom Publisher (Fixes race condition) ---
function CustomPublisher({ 
  videoEnabled, 
  audioEnabled, 
  videoEffect, 
  audioEffect 
}: { 
  videoEnabled: boolean; 
  audioEnabled: boolean; 
  videoEffect: VideoEffectType; 
  audioEffect: AudioEffectType; 
}) {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const [rawStream, setRawStream] = useState<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isRoomConnected, setIsRoomConnected] = useState(false);

  // Monitor Room State
  useEffect(() => {
    if (!room) return;
    const updateState = () => {
       setIsRoomConnected(room.state === RoomState.Connected);
    };
    updateState();
    room.on(RoomEvent.StateChanged, updateState);
    return () => { room.off(RoomEvent.StateChanged, updateState); };
  }, [room]);

  // Acquire Media
  useEffect(() => {
    let stream: MediaStream | null = null;
    const acquire = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setRawStream(stream);
        
        const vid = document.createElement('video');
        vid.srcObject = stream;
        vid.muted = true;
        vid.play().catch(e => console.warn("Helper video play error", e));
        videoRef.current = vid;
      } catch (e) { console.error("Media Acquire Error:", e); }
    };
    acquire();
    return () => { stream?.getTracks().forEach(t => t.stop()); };
  }, []);

  // Publish Video
  useEffect(() => {
    if (!localParticipant || !rawStream || !isRoomConnected) return;

    let canvasCleanup: (() => void) | undefined;

    const publishVideo = async () => {
      if (!videoEnabled) {
        const existing = localParticipant.getTrack(Track.Source.Camera);
        if (existing) await localParticipant.unpublishTrack(existing.track!);
        return;
      }

      let trackToPublish: MediaStreamTrack;

      if (videoEffect === 'none') {
        trackToPublish = rawStream.getVideoTracks()[0];
      } else {
        if (!canvasRef.current) canvasRef.current = document.createElement('canvas');
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (video) {
            canvasCleanup = createVideoProcessor(video, canvas, videoEffect);
            trackToPublish = canvas.captureStream(30).getVideoTracks()[0];
        } else {
             trackToPublish = rawStream.getVideoTracks()[0];
        }
      }

      if (trackToPublish) {
         try {
           const existing = localParticipant.getTrack(Track.Source.Camera);
           if (existing) await localParticipant.unpublishTrack(existing.track!);
           await localParticipant.publishTrack(trackToPublish, { name: 'camera', source: Track.Source.Camera });
         } catch(e) { console.error("Publish video error", e); }
      }
    };

    publishVideo();
    return () => { if (canvasCleanup) canvasCleanup(); };
  }, [localParticipant, rawStream, videoEnabled, videoEffect, isRoomConnected]);

  // Publish Audio
  useEffect(() => {
    if (!localParticipant || !rawStream || !isRoomConnected) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    const publishAudio = async () => {
        if (!audioEnabled) {
            const existing = localParticipant.getTrack(Track.Source.Microphone);
            if (existing) await localParticipant.unpublishTrack(existing.track!);
            return;
        }

        let trackToPublish: MediaStreamTrack;
        if (audioEffect === 'none') {
            trackToPublish = rawStream.getAudioTracks()[0];
        } else {
            const processedStream = createProcessedAudioStream(rawStream, audioEffect, audioContext);
            trackToPublish = processedStream.getAudioTracks()[0];
        }

        if (trackToPublish) {
            try {
                const existing = localParticipant.getTrack(Track.Source.Microphone);
                if (existing) await localParticipant.unpublishTrack(existing.track!);
                await localParticipant.publishTrack(trackToPublish, { name: 'microphone', source: Track.Source.Microphone });
            } catch(e) { console.error("Publish audio error", e); }
        }
    };

    publishAudio();
    return () => { audioContext.close(); };
  }, [localParticipant, rawStream, audioEnabled, audioEffect, isRoomConnected]);

  return null;
}

// --- Custom Cyberpunk Grid ---
function CyberpunkTile({ participant }: { participant: any }) {
  const tracks = useTracks([Track.Source.Camera]).filter(t => t.participant.identity === participant.identity);
  const videoTrack = tracks.length > 0 ? tracks[0] : null;

  return (
    <ActiveSpeaker participant={participant}>
      <Paper sx={{ 
        width: '100%', 
        height: '100%', 
        bgcolor: '#000', 
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid #333'
      }}>
        {videoTrack ? (
          <VideoTrack trackRef={videoTrack} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Box sx={{ 
                width: 80, height: 80, borderRadius: '50%', 
                bgcolor: '#1a1a1a', border: '1px solid #00f3ff',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <Typography variant="h4" sx={{ color: '#00f3ff' }}>
                    {participant.identity?.[0]?.toUpperCase() || '?'}
                </Typography>
            </Box>
          </Box>
        )}
        <Box sx={{ 
            position: 'absolute', bottom: 0, left: 0, right: 0, 
            p: 1, background: 'linear-gradient(transparent, #000)',
            display: 'flex', gap: 1, alignItems: 'center'
        }}>
            <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold' }}>
                {participant.identity} {participant.isLocal ? '(YOU)' : ''}
            </Typography>
        </Box>
      </Paper>
    </ActiveSpeaker>
  );
}

function CyberpunkGrid() {
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone]);
  
  return (
    <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: 2, 
        p: 2,
        height: '100%',
        alignContent: 'center'
    }}>
      <ParticipantLoop tracks={tracks}>
        <ParticipantContext.Consumer>
          {(participant) => (
             participant && <CyberpunkTile participant={participant} />
          )}
        </ParticipantContext.Consumer>
      </ParticipantLoop>
    </Box>
  );
}

export default function LiveAudio({ roomId }: LiveAudioProps) {
  const [token, setToken] = useState<string | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEffect, setVideoEffect] = useState<VideoEffectType>('none');
  const [audioEffect, setAudioEffect] = useState<AudioEffectType>('none');

  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const resp = await api(`/livekit/token?roomId=${roomId}`);
        const data = await resp.json();
        setToken(data.token);
      } catch (e) { console.error("LiveKit Token Error:", e); }
    })();
  }, [roomId]);

  useEffect(() => {
    if (isJoined) {
        if (previewStream) {
            previewStream.getTracks().forEach(t => t.stop());
            setPreviewStream(null);
        }
        return;
    }
    let localStream: MediaStream | null = null;
    const startPreview = async () => {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setPreviewStream(localStream);
        if (videoRef.current) videoRef.current.srcObject = localStream;
      } catch (e) { console.warn("Media access error", e); }
    };
    startPreview();
    return () => { localStream?.getTracks().forEach(t => t.stop()); };
  }, [isJoined]);

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current || isJoined) return;
    if (videoEffect === 'none') {
        videoRef.current.style.display = 'block';
        canvasRef.current.style.display = 'none';
        return;
    }
    videoRef.current.style.display = 'none';
    canvasRef.current.style.display = 'block';
    const cleanup = createVideoProcessor(videoRef.current, canvasRef.current, videoEffect);
    return cleanup;
  }, [videoEffect, previewStream, isJoined]);

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
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: 'black', p: 3, gap: 3, overflowY: 'auto' }}>
        <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 'bold', letterSpacing: 2 }}>SYSTEM_CHECK</Typography>
        <Box sx={{ position: 'relative', width: '100%', maxWidth: 480, aspectRatio: '16/9', bgcolor: '#111', border: '1px solid #333' }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: videoEnabled ? 1 : 0 }} />
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'none' }} />
            {!videoEnabled && (
                <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#000', zIndex: 5 }}>
                    <Typography sx={{ color: '#555' }}>VIDEO_FEED_OFFLINE</Typography>
                </Box>
            )}
            <Box sx={{ position: 'absolute', bottom: 10, left: 10, zIndex: 10 }}>
                {audioEnabled ? (
                    <CyberpunkAudioVisualizer stream={previewStream} width={150} height={40} />
                ) : (
                    <Typography variant="caption" sx={{ color: 'error.main', bgcolor: 'rgba(0,0,0,0.8)', px: 1 }}>MUTE</Typography>
                )}
            </Box>
        </Box>
        <Stack direction="row" spacing={2} sx={{ width: '100%', maxWidth: 480, justifyContent: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel sx={{ color: 'primary.main' }}>VISUAL_FX</InputLabel>
                <Select value={videoEffect} label="VISUAL_FX" onChange={(e: SelectChangeEvent) => setVideoEffect(e.target.value as VideoEffectType)} sx={{ color: 'white', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' } }}>
                    <MenuItem value="none">NONE</MenuItem>
                    <MenuItem value="holo">HOLOGRAM</MenuItem>
                    <MenuItem value="glitch">GLITCH</MenuItem>
                    <MenuItem value="pixelate">PIXELATE</MenuItem>
                </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel sx={{ color: 'secondary.main' }}>AUDIO_FX</InputLabel>
                <Select value={audioEffect} label="AUDIO_FX" onChange={(e: SelectChangeEvent) => setAudioEffect(e.target.value as AudioEffectType)} sx={{ color: 'white', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' } }}>
                    <MenuItem value="none">NONE</MenuItem>
                    <MenuItem value="robot">ROBOT</MenuItem>
                    <MenuItem value="cosmic">COSMIC</MenuItem>
                </Select>
            </FormControl>
        </Stack>
        <Stack direction="row" spacing={3}>
            <Button variant={videoEnabled ? "contained" : "outlined"} color={videoEnabled ? "primary" : "inherit"} onClick={() => setVideoEnabled(!videoEnabled)} sx={{ borderRadius: 0, minWidth: 120 }}>
                {videoEnabled ? "CAM: ON" : "CAM: OFF"}
            </Button>
            <Button variant={audioEnabled ? "contained" : "outlined"} color={audioEnabled ? "secondary" : "inherit"} onClick={() => setAudioEnabled(!audioEnabled)} sx={{ borderRadius: 0, minWidth: 120 }}>
                {audioEnabled ? "MIC: ON" : "MIC: OFF"}
            </Button>
        </Stack>
        <Button variant="contained" size="large" onClick={() => setIsJoined(true)} sx={{ mt: 2, px: 6, py: 1.5, fontSize: '1.2rem', bgcolor: '#00f3ff', color: '#000', fontWeight: 'bold', '&:hover': { bgcolor: '#fff' }, boxShadow: '0 0 20px rgba(0, 243, 255, 0.5)' }}>
            ENTER_ROOM
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', position: 'relative' }}>
      <LiveKitRoom
        video={false}
        audio={false}
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://localhost:7880'}
        connect={true}
        style={{ height: '100%', backgroundColor: '#000' }}
      >
        <CustomPublisher 
            videoEnabled={videoEnabled} 
            audioEnabled={audioEnabled} 
            videoEffect={videoEffect} 
            audioEffect={audioEffect} 
        />
        <LayoutContextProvider>
            <Grid container sx={{ height: 'calc(100% - 80px)' }}>
                <CyberpunkGrid />
            </Grid>
          <Box sx={{ height: 80, bgcolor: '#0a0a0a', borderTop: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton onClick={() => setVideoEnabled(!videoEnabled)} sx={{ color: videoEnabled ? 'primary.main' : 'grey.700', border: '1px solid', borderColor: videoEnabled ? 'primary.main' : 'grey.800' }}>
                    {videoEnabled ? "📷" : "🚫"}
                </IconButton>
                <IconButton onClick={() => setAudioEnabled(!audioEnabled)} sx={{ color: audioEnabled ? 'secondary.main' : 'grey.700', border: '1px solid', borderColor: audioEnabled ? 'secondary.main' : 'grey.800' }}>
                     {audioEnabled ? "🎙️" : "🔇"}
                </IconButton>
                <Select size="small" value={videoEffect} onChange={(e) => setVideoEffect(e.target.value as VideoEffectType)} sx={{ color: 'white', height: 40, borderColor: '#333' }}>
                    <MenuItem value="none">FX: OFF</MenuItem>
                    <MenuItem value="holo">HOLO</MenuItem>
                    <MenuItem value="glitch">GLITCH</MenuItem>
                </Select>
            </Box>
          </Box>
          <RoomAudioRenderer />
        </LayoutContextProvider>
      </LiveKitRoom>
    </Box>
  );
}
