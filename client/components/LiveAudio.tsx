'use client';

import { useEffect, useState, useRef } from 'react';
import { Track, RoomEvent, ConnectionState, Participant, LocalTrack } from 'livekit-client';
import {
  LiveKitRoom,
  LayoutContextProvider,
  useLocalParticipant,
  useTracks,
  useRoomContext,
  ParticipantLoop,
  useParticipants,
  ParticipantContext,
  VideoTrack,
  AudioTrack,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { api } from '../lib/api';
import CyberpunkAudioVisualizer from './CyberpunkAudioVisualizer';
import ActiveSpeaker from './ActiveSpeaker';
import { 
  createVideoProcessor, 
  createProcessedAudioStream, 
  VideoEffectType, 
  AudioEffectType 
} from '../lib/media-processors';
import { Loader2, Video, Mic, Ear, VideoOff, MicOff, Volume2 } from 'lucide-react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { cn } from '../lib/utils';

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
       setIsRoomConnected(room.state === ConnectionState.Connected);
    };
    updateState();
    room.on(RoomEvent.ConnectionStateChanged, updateState);
    return () => { room.off(RoomEvent.ConnectionStateChanged, updateState); };
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
        const existing = localParticipant.getTrackPublications().find(p => p.source === Track.Source.Camera);
        if (existing?.track) await localParticipant.unpublishTrack(existing.track as LocalTrack);
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
           const existing = localParticipant.getTrackPublications().find(p => p.source === Track.Source.Camera);
           if (existing?.track) await localParticipant.unpublishTrack(existing.track as LocalTrack);
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

    const audioContext = new window.AudioContext();
    audioContext.resume().catch(e => console.warn("AudioContext resume failed", e));

    const publishAudio = async () => {
        if (!audioEnabled) {
            const existing = localParticipant.getTrackPublications().find(p => p.source === Track.Source.Microphone);
            if (existing?.track) await localParticipant.unpublishTrack(existing.track as LocalTrack);
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
                const existing = localParticipant.getTrackPublications().find(p => p.source === Track.Source.Microphone);
                if (existing?.track) await localParticipant.unpublishTrack(existing.track as LocalTrack);
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
function CyberpunkTile({ participant }: { participant: Participant }) {
  const allTracks = useTracks([Track.Source.Camera, Track.Source.Microphone]);
  const videoTrack = allTracks.find(t => t.participant.identity === participant.identity && t.source === Track.Source.Camera) || null;
  const audioTrack = allTracks.find(t => t.participant.identity === participant.identity && t.source === Track.Source.Microphone) || null;

  return (
    <ActiveSpeaker participant={participant}>
      <div className="w-full h-full bg-black relative overflow-hidden border border-border rounded-lg shadow-sm">
        {videoTrack ? (
          <VideoTrack trackRef={videoTrack} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div className="flex items-center justify-center h-full bg-muted/20">
            <div className="w-20 h-20 rounded-full bg-background border border-primary flex items-center justify-center">
                <span className="text-3xl text-primary font-bold">
                    {participant.identity?.[0]?.toUpperCase() || '?'}
                </span>
            </div>
          </div>
        )}
        {/* Render audio track for remote participants */}
        {audioTrack && !participant.isLocal && (
          <AudioTrack trackRef={audioTrack} />
        )}
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent flex gap-2 items-center">
            <span className="text-xs text-white font-bold truncate">
                {participant.identity} {participant.isLocal ? '(YOU)' : ''}
            </span>
            {audioTrack && <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />}
        </div>
      </div>
    </ActiveSpeaker>
  );
}

function CyberpunkGrid() {
  const participants = useParticipants();
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 h-full content-start overflow-y-auto">
      <ParticipantLoop participants={participants}>
        <ParticipantContext.Consumer>
          {(participant) => (
             participant && <CyberpunkTile participant={participant} />
          )}
        </ParticipantContext.Consumer>
      </ParticipantLoop>
    </div>
  );
}

type JoinMode = 'voice' | 'video' | 'listen';

export default function LiveAudio({ roomId }: LiveAudioProps) {
  const [token, setToken] = useState<string | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [joinMode, setJoinMode] = useState<JoinMode>('video');
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEffect, setVideoEffect] = useState<VideoEffectType>('none');
  const [audioEffect, setAudioEffect] = useState<AudioEffectType>('none');
  const [audioUnlocked, setAudioUnlocked] = useState(false);

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

  // Cleanup preview stream when joining room
  useEffect(() => {
    if (isJoined && previewStream) {
        previewStream.getTracks().forEach(t => t.stop());
    }
  }, [isJoined, previewStream]);

  // Start preview stream when not joined
  useEffect(() => {
    if (isJoined) return;

    let localStream: MediaStream | null = null;
    let isCancelled = false;

    const startPreview = async () => {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!isCancelled) {
          setPreviewStream(localStream);
          if (videoRef.current) videoRef.current.srcObject = localStream;
        } else {
          localStream.getTracks().forEach(t => t.stop());
        }
      } catch (e) { console.warn("Media access error", e); }
    };
    startPreview();
    return () => {
      isCancelled = true;
      localStream?.getTracks().forEach(t => t.stop());
    };
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
      <div className="flex flex-col items-center justify-center h-full bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="mt-2 text-primary text-xs tracking-wider animate-pulse">ESTABLISHING_NEURAL_LINK...</span>
      </div>
    );
  }

  // Handle mode selection
  const handleModeSelect = (mode: JoinMode) => {
    setJoinMode(mode);
    switch (mode) {
      case 'video':
        setVideoEnabled(true);
        setAudioEnabled(true);
        break;
      case 'voice':
        setVideoEnabled(false);
        setAudioEnabled(true);
        break;
      case 'listen':
        setVideoEnabled(false);
        setAudioEnabled(false);
        break;
    }
  };

  if (!isJoined) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black p-4 gap-6 overflow-y-auto">
        <h2 className="text-2xl font-bold text-primary tracking-widest">CHOOSE_MODE</h2>

        {/* Mode Selection */}
        <div className="flex gap-4 mb-4 flex-wrap justify-center">
          <Button
            variant={joinMode === 'video' ? 'default' : 'outline'}
            onClick={() => handleModeSelect('video')}
            className={cn(
              "h-auto py-4 min-w-[140px] flex flex-col gap-2",
              joinMode === 'video' ? "border-primary shadow-[0_0_20px_rgba(var(--primary),0.3)]" : "border-border"
            )}
          >
            <Video className="w-8 h-8 mb-1" />
            <span className="font-bold text-xs">VIDEO CHAT</span>
            <span className="text-[10px] opacity-70">Camera + Mic</span>
          </Button>
          
          <Button
            variant={joinMode === 'voice' ? 'secondary' : 'outline'}
            onClick={() => handleModeSelect('voice')}
            className={cn(
              "h-auto py-4 min-w-[140px] flex flex-col gap-2",
              joinMode === 'voice' ? "border-secondary shadow-[0_0_20px_rgba(var(--secondary),0.3)]" : "border-border"
            )}
          >
            <Mic className="w-8 h-8 mb-1" />
            <span className="font-bold text-xs">VOICE ONLY</span>
            <span className="text-[10px] opacity-70">Mic only</span>
          </Button>

          <Button
            variant={joinMode === 'listen' ? 'ghost' : 'outline'}
            onClick={() => handleModeSelect('listen')}
            className={cn(
              "h-auto py-4 min-w-[140px] flex flex-col gap-2",
              joinMode === 'listen' ? "bg-muted text-foreground border-muted-foreground" : "border-border"
            )}
          >
            <Ear className="w-8 h-8 mb-1" />
            <span className="font-bold text-xs">LISTEN ONLY</span>
            <span className="text-[10px] opacity-70">Just listen</span>
          </Button>
        </div>

        {/* Preview Area */}
        <div className="relative w-full max-w-lg aspect-video bg-muted/10 border border-border rounded-lg overflow-hidden">
            <video ref={videoRef} autoPlay playsInline muted className={cn("w-full h-full object-cover", videoEnabled ? "opacity-100" : "opacity-0")} />
            <canvas ref={canvasRef} className="w-full h-full object-cover hidden" />
            {!videoEnabled && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 gap-2">
                    {joinMode === 'voice' ? <Mic className="w-16 h-16 text-muted-foreground" /> : <Ear className="w-16 h-16 text-muted-foreground" />}
                    <span className="text-muted-foreground font-mono">{joinMode === 'voice' ? 'VOICE_MODE' : 'LISTEN_MODE'}</span>
                </div>
            )}
            <div className="absolute bottom-2 left-2 z-20">
                {audioEnabled ? (
                    <CyberpunkAudioVisualizer stream={previewStream} width={150} height={40} />
                ) : (
                    <span className="text-xs text-muted-foreground bg-black/80 px-2 py-1 rounded">MICROPHONE OFF</span>
                )}
            </div>
        </div>

        {/* Effects - only show for video/voice modes */}
        {(joinMode === 'video' || joinMode === 'voice') && (
          <div className="flex gap-4 w-full max-w-lg justify-center">
              {joinMode === 'video' && (
                <div className="min-w-[120px]">
                    <label className="text-xs text-primary mb-1 block">VISUAL_FX</label>
                    <Select value={videoEffect} onValueChange={(val) => setVideoEffect(val as VideoEffectType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">NONE</SelectItem>
                        <SelectItem value="holo">HOLOGRAM</SelectItem>
                        <SelectItem value="glitch">GLITCH</SelectItem>
                        <SelectItem value="pixelate">PIXELATE</SelectItem>
                      </SelectContent>
                    </Select>
                </div>
              )}
              <div className="min-w-[120px]">
                  <label className="text-xs text-secondary mb-1 block">AUDIO_FX</label>
                  <Select value={audioEffect} onValueChange={(val) => setAudioEffect(val as AudioEffectType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">NONE</SelectItem>
                      <SelectItem value="robot">ROBOT</SelectItem>
                      <SelectItem value="cosmic">COSMIC</SelectItem>
                    </SelectContent>
                  </Select>
              </div>
          </div>
        )}

        {/* Manual Toggle Buttons */}
        <div className="flex gap-4">
            <Button 
                variant={videoEnabled ? "default" : "outline"} 
                onClick={() => setVideoEnabled(!videoEnabled)} 
                className="min-w-[140px]"
            >
                {videoEnabled ? <><Video className="mr-2 h-4 w-4" /> CAM: ON</> : <><VideoOff className="mr-2 h-4 w-4" /> CAM: OFF</>}
            </Button>
            <Button 
                variant={audioEnabled ? "secondary" : "outline"} 
                onClick={() => setAudioEnabled(!audioEnabled)} 
                className="min-w-[140px]"
            >
                {audioEnabled ? <><Mic className="mr-2 h-4 w-4" /> MIC: ON</> : <><MicOff className="mr-2 h-4 w-4" /> MIC: OFF</>}
            </Button>
        </div>

        <Button 
            size="lg" 
            onClick={() => setIsJoined(true)} 
            className="mt-4 px-12 py-6 text-lg font-bold bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_20px_rgba(6,182,212,0.5)]"
        >
            ENTER_ROOM
        </Button>

        <p className="text-xs text-muted-foreground text-center max-w-md">
          You will be able to hear others speak once you enter the room. Make sure to click the audio button to enable sound playback.
        </p>
      </div>
    );
  }

  const handleAudioUnlock = () => {
    setAudioUnlocked(true);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <LiveKitRoom
        video={false}
        audio={false}
        token={token}
        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://localhost:7880'}
        connect={true}
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        <CustomPublisher
            videoEnabled={videoEnabled}
            audioEnabled={audioEnabled}
            videoEffect={videoEffect}
            audioEffect={audioEffect}
        />
        <LayoutContextProvider>
            {/* Main Content Area - flexGrow to fill available space */}
            <div className="flex-1 min-h-0 overflow-hidden relative">
              {/* Audio Unlock Overlay - Only covers the participant grid */}
              {!audioUnlocked && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
                  <div className="text-center p-6">
                    <Volume2 className="w-16 h-16 text-primary mx-auto mb-4 animate-bounce" />
                    <h3 className="text-xl font-bold text-white mb-2">AUDIO REQUIRED</h3>
                    <p className="text-muted-foreground mb-6">Click below to enable neural audio link</p>
                    <Button onClick={handleAudioUnlock} size="lg" className="w-full">
                      ENABLE AUDIO
                    </Button>
                  </div>
                </div>
              )}
              
              <CyberpunkGrid />
            </div>
        </LayoutContextProvider>
      </LiveKitRoom>
    </div>
  );
}
