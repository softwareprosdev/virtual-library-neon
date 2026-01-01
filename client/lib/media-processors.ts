export type VideoEffectType = 'none' | 'holo' | 'glitch' | 'pixelate';
export type AudioEffectType = 'none' | 'robot' | 'cosmic';

/**
 * Applies visual effects to a video stream using a canvas.
 * Returns a generator/cleanup function.
 */
export function createVideoProcessor(
  sourceVideo: HTMLVideoElement,
  targetCanvas: HTMLCanvasElement,
  effect: VideoEffectType
) {
  const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;

  let animationFrameId: number;
  let frameCount = 0;

  const draw = () => {
    if (sourceVideo.paused || sourceVideo.ended) return;

    // Match dimensions
    if (targetCanvas.width !== sourceVideo.videoWidth) {
      targetCanvas.width = sourceVideo.videoWidth;
      targetCanvas.height = sourceVideo.videoHeight;
    }

    ctx.drawImage(sourceVideo, 0, 0, targetCanvas.width, targetCanvas.height);

    const width = targetCanvas.width;
    const height = targetCanvas.height;

    // Apply Effects
    if (effect === 'holo') {
      // Green/Blue Tint
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = 'rgba(0, 255, 200, 0.2)';
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';

      // Scanlines
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      for (let y = 0; y < height; y += 4) {
        ctx.fillRect(0, y, width, 1);
      }
    } else if (effect === 'glitch') {
        // Random horizontal slice displacement
        if (Math.random() > 0.8) {
            const sliceHeight = Math.random() * 50;
            const sliceY = Math.random() * height;
            const displacement = (Math.random() - 0.5) * 40;
            try {
                const imageData = ctx.getImageData(0, sliceY, width, sliceHeight);
                ctx.putImageData(imageData, displacement, sliceY);
            } catch (e) {
                // Ignore cross-origin issues if any
            }
        }
        
        // Color channel shift (simplistic)
        if (Math.random() > 0.9) {
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = '#ff00ff';
            ctx.fillRect(0,0, width, height);
            ctx.globalCompositeOperation = 'source-over';
        }
    } else if (effect === 'pixelate') {
        // Simple pixelation by downscaling and upscaling is hard in one pass without another canvas
        // We'll simulate a grid overlay
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        for(let x=0; x<width; x+=10) ctx.fillRect(x, 0, 1, height);
        for(let y=0; y<height; y+=10) ctx.fillRect(0, y, width, 1);
    }

    frameCount++;
    animationFrameId = requestAnimationFrame(draw);
  };

  draw();

  return () => cancelAnimationFrame(animationFrameId);
}

/**
 * Adds audio effects to a MediaStream.
 * Returns the processed MediaStream.
 */
export function createProcessedAudioStream(
  sourceStream: MediaStream,
  effect: AudioEffectType,
  audioContext: AudioContext
): MediaStream {
  if (effect === 'none') return sourceStream;

  const source = audioContext.createMediaStreamSource(sourceStream);
  const destination = audioContext.createMediaStreamDestination();

  if (effect === 'robot') {
    // Ring Modulator
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = 50; // Low frequency for robotic growl

    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0; // Controlled by oscillator

    // Connect Osc to Gain.gain
    // Note: To make it audible, we need: Source -> Gain (modulated) -> Dest
    // Standard Ring Mod: Source * Carrier
    
    // Web Audio "AudioParam" connection
    // Source -> VCA (Voltage Controlled Amplifier) -> Dest
    // Osc -> VCA.gain
    
    const vca = audioContext.createGain();
    vca.gain.value = 0.5; // Base gain

    oscillator.connect(vca.gain);
    
    source.connect(vca);
    vca.connect(destination);
    
    oscillator.start();
  } else if (effect === 'cosmic') {
    // Delay / Echo
    const delay = audioContext.createDelay();
    delay.delayTime.value = 0.4; // 400ms delay

    const feedback = audioContext.createGain();
    feedback.gain.value = 0.4;

    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    source.connect(destination); // Dry signal
    source.connect(delay);
    delay.connect(filter);
    filter.connect(feedback);
    feedback.connect(delay); // Loop
    filter.connect(destination); // Wet signal
  } else {
    source.connect(destination);
  }

  return destination.stream;
}
