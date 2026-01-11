'use client';

import { useEffect, useRef } from 'react';

interface MatrixRainProps {
  className?: string;
  color?: string;
  highlightColor?: string;
}

export default function MatrixRain({ 
  className = '', 
  color = '#00f0ff', 
  highlightColor = '#fcee0a' 
}: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to full window
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Characters to use (Katakana + Latin + Numbers)
    const katakana = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン';
    const latin = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nums = '0123456789';
    const alphabet = katakana + latin + nums;

    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);

    // Array of drops - one per column
    // Initialize with random y positions to avoid "curtain" effect on start
    const drops: number[] = [];
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100; // Start above canvas
    }

    // Drawing loop
    const draw = () => {
      // translucent BG to show trail
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = fontSize + 'px monospace';

      for (let i = 0; i < drops.length; i++) {
        // Random character
        const text = alphabet.charAt(Math.floor(Math.random() * alphabet.length));

        // Randomly choose color: mostly main color, sometimes highlight
        const isHighlight = Math.random() > 0.975;
        ctx.fillStyle = isHighlight ? highlightColor : color;

        // Draw the character
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        // Reset drop to top randomly after it has crossed the screen
        // Adding randomness to the reset to ensure drops are scattered
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        // Move drop down
        drops[i]++;
      }
    };

    // Frame rate control
    let animationId: number;
    let lastTime = 0;
    const fps = 30;
    const interval = 1000 / fps;

    const animate = (currentTime: number) => {
      animationId = requestAnimationFrame(animate);

      if (currentTime - lastTime >= interval) {
        draw();
        lastTime = currentTime;
      }
    };

    animate(0);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, [color, highlightColor]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed top-0 left-0 w-full h-full pointer-events-none -z-10 opacity-30 ${className}`}
      style={{ filter: 'blur(0.5px)' }}
    />
  );
}
