'use client';

import { useEffect, useRef } from 'react';
import { Box } from '@mui/material';

interface CyberpunkAudioVisualizerProps {
  stream: MediaStream | null;
  width?: number;
  height?: number;
}

export default function CyberpunkAudioVisualizer({ stream, width = 300, height = 100 }: CyberpunkAudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    if (!stream || !canvasRef.current) return;

    // Initialize Audio Context
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    audioContextRef.current = audioContext;

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;

    try {
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;
    } catch (e) {
      console.error("Error creating media stream source:", e);
      return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;

        // Cyberpunk colors: Pink/Cyan/Purple gradient logic or random glitch
        // Gradient from Cyan (#00f3ff) to Pink (#bc13fe)
        const r = 0 + (i / bufferLength) * 188; // 0 -> 188
        const g = 243 - (i / bufferLength) * 224; // 243 -> 19
        const b = 255;
        
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        
        // Add a "glitch" offset occasionally
        const glitchOffset = Math.random() > 0.98 ? Math.random() * 5 : 0;

        ctx.fillRect(x, canvas.height - barHeight - glitchOffset, barWidth, barHeight + glitchOffset);

        // Mirror effect for "audio wave" look
        // ctx.fillRect(x, 0, barWidth, barHeight); 

        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (sourceRef.current) sourceRef.current.disconnect();
      if (analyserRef.current) analyserRef.current.disconnect();
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [stream]);

  if (!stream) {
    return (
        <Box sx={{ width, height, bgcolor: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #333' }}>
            <Box className="neon-text" sx={{ fontSize: '0.7rem', opacity: 0.5 }}>NO_AUDIO_SIGNAL</Box>
        </Box>
    );
  }

  return (
    <canvas 
      ref={canvasRef} 
      width={width} 
      height={height} 
      style={{ 
        border: '1px solid #00f3ff', 
        boxShadow: '0 0 10px #00f3ff',
        borderRadius: '4px',
        backgroundColor: '#000'
      }} 
    />
  );
}
