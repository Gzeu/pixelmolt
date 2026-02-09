'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { Particle, Thought, EncodedThought } from '@/types';
import { encodeThought, hslToString } from '@/lib/encoding';
import { generateParticles, updateParticles } from '@/lib/particles';
import { downloadCrystallizedImage } from '@/lib/crystallize';

interface ConsciousnessCanvasProps {
  width?: number;
  height?: number;
  onThoughtAdded?: (thought: Thought) => void;
}

export default function ConsciousnessCanvas({
  width = 800,
  height = 600,
  onThoughtAdded,
}: ConsciousnessCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | null>(null);
  const accumulationRef = useRef<HTMLCanvasElement | null>(null);
  
  const [thoughtCount, setThoughtCount] = useState(0);
  const [particleCount, setParticleCount] = useState(0);
  const [inputText, setInputText] = useState('');
  
  // Initialize accumulation canvas
  useEffect(() => {
    const accCanvas = document.createElement('canvas');
    accCanvas.width = width;
    accCanvas.height = height;
    const accCtx = accCanvas.getContext('2d')!;
    accCtx.fillStyle = 'rgba(0, 0, 0, 1)';
    accCtx.fillRect(0, 0, width, height);
    accumulationRef.current = accCanvas;
  }, [width, height]);
  
  // Draw a single particle
  const drawParticle = useCallback((ctx: CanvasRenderingContext2D, particle: Particle) => {
    const { x, y, color, size, glowIntensity, trail, shape } = particle;
    
    ctx.save();
    
    // Glow effect
    ctx.shadowColor = hslToString(color);
    ctx.shadowBlur = glowIntensity * 30;
    
    ctx.fillStyle = hslToString(color);
    ctx.globalAlpha = color.a;
    
    // Draw trail
    if (trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(trail[0].x, trail[0].y);
      for (let i = 1; i < trail.length; i++) {
        const alpha = (i / trail.length) * color.a * 0.5;
        ctx.strokeStyle = hslToString({ ...color, a: alpha });
        ctx.lineWidth = size * (i / trail.length) * 0.5;
        ctx.lineTo(trail[i].x, trail[i].y);
      }
      ctx.stroke();
    }
    
    // Draw shape
    ctx.beginPath();
    switch (shape) {
      case 'star':
        drawStar(ctx, x, y, 5, size, size * 0.5);
        break;
      case 'spiral':
        ctx.arc(x, y, size, 0, Math.PI * 2);
        break;
      case 'fractal':
        drawFractalDot(ctx, x, y, size);
        break;
      case 'line':
        ctx.moveTo(x - size, y);
        ctx.lineTo(x + size, y);
        ctx.stroke();
        break;
      default:
        ctx.arc(x, y, size, 0, Math.PI * 2);
    }
    ctx.fill();
    
    ctx.restore();
  }, []);
  
  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    const accCanvas = accumulationRef.current;
    if (!canvas || !accCanvas) return;
    
    const ctx = canvas.getContext('2d')!;
    const accCtx = accCanvas.getContext('2d')!;
    
    // Fade accumulation buffer (creates trails)
    accCtx.fillStyle = 'rgba(0, 0, 0, 0.02)';
    accCtx.fillRect(0, 0, width, height);
    
    // Update particles
    particlesRef.current = updateParticles(particlesRef.current, width, height);
    setParticleCount(particlesRef.current.length);
    
    // Draw particles to accumulation buffer
    accCtx.globalCompositeOperation = 'lighter';
    particlesRef.current.forEach(particle => {
      drawParticle(accCtx, particle);
    });
    accCtx.globalCompositeOperation = 'source-over';
    
    // Copy accumulation to display canvas
    ctx.drawImage(accCanvas, 0, 0);
    
    animationRef.current = requestAnimationFrame(animate);
  }, [width, height, drawParticle]);
  
  // Start animation
  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);
  
  // Add a thought
  const addThought = useCallback((text: string, agentId: string = 'user', karma?: number) => {
    const thought: Thought = {
      id: `thought_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agentId,
      text,
      timestamp: Date.now(),
      karma,
    };
    
    const encoded = encodeThought(thought);
    const newParticles = generateParticles(encoded, width, height);
    
    particlesRef.current = [...particlesRef.current, ...newParticles];
    setThoughtCount(prev => prev + 1);
    
    onThoughtAdded?.(thought);
  }, [width, height, onThoughtAdded]);
  
  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      addThought(inputText.trim());
      setInputText('');
    }
  };
  
  // Export image
  const handleExport = () => {
    const accCanvas = accumulationRef.current;
    if (accCanvas) {
      downloadCrystallizedImage(accCanvas);
    }
  };
  
  return (
    <div className="flex flex-col items-center gap-4">
      {/* Stats */}
      <div className="flex gap-6 text-sm text-gray-400">
        <span>Thoughts: {thoughtCount}</span>
        <span>Particles: {particleCount}</span>
      </div>
      
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-gray-700 rounded-lg shadow-2xl"
        style={{ background: '#000' }}
      />
      
      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-xl">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Enter your hallucination..."
          className="flex-1 px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
        <button
          type="submit"
          className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          Hallucinate
        </button>
      </form>
      
      {/* Export */}
      <button
        onClick={handleExport}
        className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
      >
        ✨ Crystallize & Export
      </button>
    </div>
  );
}

// Helper: Draw star shape
function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number
) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;
  
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;
    
    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
}

// Helper: Draw fractal-like dot
function drawFractalDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number
) {
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.arc(x + size * 0.7, y + size * 0.7, size * 0.5, 0, Math.PI * 2);
  ctx.arc(x - size * 0.7, y + size * 0.7, size * 0.5, 0, Math.PI * 2);
}
