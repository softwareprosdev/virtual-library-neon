'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Mic, Video } from 'lucide-react';

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

        socket.on('userJoined', () => {
          // User joined
        });

        socket.on('signal', () => {
          // Handle incoming WebRTC signal
        });
      } catch (err: unknown) {
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
      <div className="h-full flex items-center justify-center p-4 text-center">
        <div className="p-8 bg-destructive/10 border border-destructive max-w-sm rounded-lg">
          <h6 className="text-destructive font-bold mb-2">PERMISSION REQUIRED</h6>
          <p className="text-sm mb-6 text-foreground/80">{error}</p>
          <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={() => window.location.reload()}>Retry Connection</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4 p-4">
      <div className="flex gap-4 flex-wrap">
        {/* Local Video */}
        <div className="w-[300px] h-[225px] bg-black relative overflow-hidden border border-[#d946ef] rounded-lg shadow-md">
          <video playsInline muted ref={userVideo} autoPlay className="w-full h-full object-cover" />
          <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-0.5 rounded text-xs text-white">
            YOU (Local)
          </div>
        </div>

        {/* Remote Videos */}
        {Object.keys(remoteStreams).map(id => (
           <div key={id} className="w-[300px] h-[225px] bg-black border border-[#ec4899] rounded-lg overflow-hidden shadow-md">
              <video playsInline autoPlay ref={el => { if(el) el.srcObject = remoteStreams[id] }} className="w-full h-full object-cover" />
           </div>
        ))}
      </div>

      <div className="mt-auto flex justify-center gap-4">
        <Button variant="outline" size="icon" className="rounded-full w-12 h-12">
          <Mic className="h-5 w-5" />
        </Button>
        <Button variant="outline" size="icon" className="rounded-full w-12 h-12">
          <Video className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
