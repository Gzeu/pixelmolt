'use client';

import { useMemo, useRef, useEffect } from 'react';
import type { Pixel } from '@/types';

interface MiniMapProps {
  pixels: Pixel[];
  canvasSize: number;
  viewportX?: number;
  viewportY?: number;
  viewportSize?: number;
  onNavigate?: (x: number, y: number) => void;
}

export function MiniMap({ 
  pixels, 
  canvasSize, 
  viewportX = 0, 
  viewportY = 0,
  viewportSize = 10,
  onNavigate 
}: MiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapSize = 120; // pixels
  const scale = mapSize / canvasSize;

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, mapSize, mapSize);

    // Draw all pixels
    pixels.forEach((pixel) => {
      ctx.fillStyle = pixel.color;
      const x = Math.floor(pixel.x * scale);
      const y = Math.floor(pixel.y * scale);
      const size = Math.max(1, Math.ceil(scale));
      ctx.fillRect(x, y, size, size);
    });

    // Draw viewport indicator
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      viewportX * scale,
      viewportY * scale,
      viewportSize * scale,
      viewportSize * scale
    );
  }, [pixels, canvasSize, viewportX, viewportY, viewportSize, scale]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onNavigate) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = Math.floor((e.clientX - rect.left) / scale);
    const y = Math.floor((e.clientY - rect.top) / scale);
    
    onNavigate(
      Math.max(0, Math.min(canvasSize - viewportSize, x - viewportSize / 2)),
      Math.max(0, Math.min(canvasSize - viewportSize, y - viewportSize / 2))
    );
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-3 backdrop-blur border border-gray-700/50">
      <h3 className="text-white font-semibold text-xs mb-2 flex items-center gap-2">
        <span>🗺️</span> Mini-Map
      </h3>
      <canvas
        ref={canvasRef}
        width={mapSize}
        height={mapSize}
        onClick={handleClick}
        className="rounded border border-gray-600 cursor-pointer hover:border-purple-500 transition-colors"
      />
      <div className="mt-2 text-[10px] text-gray-500 text-center">
        Click to navigate
      </div>
    </div>
  );
}

export default MiniMap;
