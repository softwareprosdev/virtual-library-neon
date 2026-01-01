'use client';

import { useEffect, useState, useRef } from 'react';
import { Track } from 'livekit-client';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
  LayoutContextProvider,
  useLocalParticipant,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Box, CircularProgress, Typography, Button, Stack, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import { api } from '../lib/api';
import CyberpunkAudioVisualizer from './CyberpunkAudioVisualizer';
import { 
  createVideoProcessor, 
  createProcessedAudioStream, 
  VideoEffectType, 
  AudioEffectType 
} from '../lib/media-processors';

interface LiveAudioProps {
  roomId: string;
}

// Inner component to handle custom track publishing
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
  const [rawStream, setRawStream] = useState<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  // 1. Acquire Raw Media
  useEffect(() => {
    let stream: MediaStream | null = null;
    const acquire = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setRawStream(stream);
        
        // Helper video element for processing
        const vid = document.createElement('video');
        vid.srcObject = stream;
        vid.muted = true;
        vid.play();
        videoRef.current = vid;

      } catch (e) {
        console.error("Failed to acquire media for publishing:", e);
      }
    };
    acquire();
    return () => {
      stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // 2. Process & Publish Video
  useEffect(() => {
    if (!localParticipant || !rawStream || !videoEnabled) return;

    let publishedTrack: any = null;
    let canvasCleanup: (() => void) | undefined;

    const publishVideo = async () => {
      // If no effect, publish raw track? 
      // Consistently using canvas is safer for switching, but raw is better quality.
      // Let's use canvas if effect != none.
      
      let trackToPublish: MediaStreamTrack;

      if (videoEffect === 'none') {
        trackToPublish = rawStream.getVideoTracks()[0];
      } else {
        // Setup Canvas
        if (!canvasRef.current) {
            // Create offscreen canvas if possible, or just a detached element
            canvasRef.current = document.createElement('canvas');
        }
        const canvas = canvasRef.current;
        const video = videoRef.current; // The helper video
        
        if (video) {
            canvasCleanup = createVideoProcessor(video, canvas, videoEffect);
            trackToPublish = canvas.captureStream(30).getVideoTracks()[0];
        } else {
             trackToPublish = rawStream.getVideoTracks()[0]; // Fallback
        }
      }

      if (trackToPublish) {
         try {
           const pub = await localParticipant.publishTrack(trackToPublish, { name: 'camera', source: Track.Source.Camera });
           publishedTrack = pub;
         } catch(e) { console.error("Publish video error", e); }
      }
    };

    publishVideo();

    return () => {
      if (publishedTrack) localParticipant.unpublishTrack(publishedTrack);
      if (canvasCleanup) canvasCleanup();
    };
  }, [localParticipant, rawStream, videoEnabled, videoEffect]);

  // 3. Process & Publish Audio
  useEffect(() => {
    if (!localParticipant || !rawStream || !audioEnabled) return;

    let publishedTrack: any = null;
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    const publishAudio = async () => {
        let trackToPublish: MediaStreamTrack;
        
        if (audioEffect === 'none') {
            trackToPublish = rawStream.getAudioTracks()[0];
        } else {
            const processedStream = createProcessedAudioStream(rawStream, audioEffect, audioContext);
            trackToPublish = processedStream.getAudioTracks()[0];
        }

        if (trackToPublish) {
            try {
                const pub = await localParticipant.publishTrack(trackToPublish, { name: 'microphone', source: Track.Source.Microphone });
                publishedTrack = pub;
            } catch(e) { console.error("Publish audio error", e); }
        }
    };

    publishAudio();

    return () => {
        if (publishedTrack) localParticipant.unpublishTrack(publishedTrack);
        audioContext.close();
    };
  }, [localParticipant, rawStream, audioEnabled, audioEffect]);

  return null; // Headless component
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

  // Handle Preview Stream (Raw)
  useEffect(() => {
    if (isJoined) {
        // Stop preview streams
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
        if (videoRef.current) {
          videoRef.current.srcObject = localStream;
        }
      } catch (e) { console.warn("Media access error", e); }
    };
    startPreview();
    return () => { localStream?.getTracks().forEach(t => t.stop()); };
  }, [isJoined]);

  // Preview Effects Logic
  useEffect(() => {
    if (!videoRef.current || !canvasRef.current || isJoined) return;
    
    // If effect is none, hide canvas, show video
    if (videoEffect === 'none') {
        videoRef.current.style.display = 'block';
        canvasRef.current.style.display = 'none';
        return;
    }

    // If effect active, hide video, show canvas
    videoRef.current.style.display = 'none';
    canvasRef.current.style.display = 'block';

    const cleanup = createVideoProcessor(videoRef.current, canvasRef.current, videoEffect);
    return cleanup;
  }, [videoEffect, previewStream, isJoined]);


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
        gap: 3,
        overflowY: 'auto'
      }}>
        <Typography variant="h5" sx={{ color: 'primary.main', fontWeight: 'bold', letterSpacing: 2 }}>
          SYSTEM_CHECK
        </Typography>

        <Box sx={{ position: 'relative', width: '100%', maxWidth: 480, aspectRatio: '16/9', bgcolor: '#111', border: '1px solid #333' }}>
            {/* Raw Video (Source) */}
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover',
                    opacity: videoEnabled ? 1 : 0
                }} 
            />
            {/* Processed Canvas */}
            <canvas
                ref={canvasRef}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'none'
                }}
            />
            
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
                <Select
                    value={videoEffect}
                    label="VISUAL_FX"
                    onChange={(e: SelectChangeEvent) => setVideoEffect(e.target.value as VideoEffectType)}
                    sx={{ color: 'white', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' } }}
                >
                    <MenuItem value="none">NONE</MenuItem>
                    <MenuItem value="holo">HOLOGRAM</MenuItem>
                    <MenuItem value="glitch">GLITCH</MenuItem>
                    <MenuItem value="pixelate">PIXELATE</MenuItem>
                </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel sx={{ color: 'secondary.main' }}>AUDIO_FX</InputLabel>
                <Select
                    value={audioEffect}
                    label="AUDIO_FX"
                    onChange={(e: SelectChangeEvent) => setAudioEffect(e.target.value as AudioEffectType)}
                    sx={{ color: 'white', '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' } }}
                >
                    <MenuItem value="none">NONE</MenuItem>
                    <MenuItem value="robot">ROBOT</MenuItem>
                    <MenuItem value="cosmic">COSMIC</MenuItem>
                </Select>
            </FormControl>
        </Stack>

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
        video={false} // Disable default, use CustomPublisher
        audio={false} // Disable default
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://your-project.livekit.cloud'}
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
            <ControlBar variation="minimal" controls={{ camera: false, microphone: false, screenShare: true, leave: true }} />
            {/* Custom controls could go here to toggle effects live */}
          </Box>

          <RoomAudioRenderer />
        </LayoutContextProvider>
      </LiveKitRoom>
    </Box>
  );
}