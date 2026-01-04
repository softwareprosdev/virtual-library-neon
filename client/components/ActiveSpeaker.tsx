'use client';

import { useIsSpeaking } from '@livekit/components-react';
import { Participant } from 'livekit-client';
import { cn } from '../lib/utils';

interface ActiveSpeakerProps {
  participant: Participant;
  children: React.ReactNode;
}

export default function ActiveSpeaker({ participant, children }: ActiveSpeakerProps) {
  const isSpeaking = useIsSpeaking(participant);

  return (
    <div className="relative h-full w-full">
      {/* Glow Effect when speaking */}
      <div className={cn(
        "absolute inset-[-2px] rounded-lg transition-all duration-200 pointer-events-none z-10",
        isSpeaking 
          ? "border-2 border-[#00f3ff] shadow-[0_0_15px_#00f3ff,inset_0_0_10px_#00f3ff]" 
          : "border border-border"
      )} />

      {/* Audio Wave Animation Overlay */}
      {isSpeaking && (
        <div className="absolute bottom-2 right-2 flex gap-0.5 items-end h-5 z-20">
          {[...Array(3)].map((_, i) => (
             <div key={i} 
                className="w-1 bg-[#00f3ff]"
                style={{
                    animation: `equalizer 0.5s ease-in-out infinite alternate`,
                    animationDelay: `${i * 0.1}s`,
                    height: '20%' // Fallback/Start
                }} 
             />
          ))}
        </div>
      )}
      
      <style jsx global>{`
        @keyframes equalizer {
          0% { height: 20%; }
          100% { height: 100%; }
        }
      `}</style>

      {children}
    </div>
  );
}
