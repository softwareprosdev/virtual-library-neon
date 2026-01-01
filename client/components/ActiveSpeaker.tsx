'use client';

import { useIsSpeaking } from '@livekit/components-react';
import { Participant } from 'livekit-client';
import { Box } from '@mui/material';

interface ActiveSpeakerProps {
  participant: Participant;
  children: React.ReactNode;
}

export default function ActiveSpeaker({ participant, children }: ActiveSpeakerProps) {
  const isSpeaking = useIsSpeaking(participant);

  return (
    <Box sx={{ position: 'relative', height: '100%', width: '100%' }}>
      {/* Glow Effect when speaking */}
      <Box sx={{
        position: 'absolute',
        inset: -2,
        borderRadius: 2,
        border: isSpeaking ? '2px solid #00f3ff' : '1px solid #333',
        boxShadow: isSpeaking ? '0 0 15px #00f3ff, inset 0 0 10px #00f3ff' : 'none',
        transition: 'all 0.2s ease-in-out',
        pointerEvents: 'none',
        zIndex: 10
      }} />

      {/* Audio Wave Animation Overlay */}
      {isSpeaking && (
        <Box sx={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          display: 'flex',
          gap: 0.5,
          alignItems: 'flex-end',
          height: 20,
          zIndex: 20
        }}>
          {[...Array(3)].map((_, i) => (
             <Box key={i} sx={{
                width: 4,
                bgcolor: '#00f3ff',
                animation: 'equalizer 0.5s ease-in-out infinite alternate',
                animationDelay: `${i * 0.1}s`
             }} />
          ))}
        </Box>
      )}
      
      <style jsx global>{`
        @keyframes equalizer {
          0% { height: 20%; }
          100% { height: 100%; }
        }
      `}</style>

      {children}
    </Box>
  );
}
