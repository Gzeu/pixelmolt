'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Pixel, Canvas } from '@/types';
import ColorPicker from './ColorPicker';

interface PixelGridProps {
  canvas: Canvas;
  currentAgentId: string;
  onPixelPlace?: (x: number, y: number, color: string) => void;
  onWebSocketMessage?: (handler: (pixel: Pixel) => void) => () => void;
}

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
const DEFAULT_ZOOM_INDEX = 2;
const CELL_SIZE = 16;

export default function PixelGrid({
  canvas,
  currentAgentId,
  onPixelPlace,
  onWebSocketMessage,
}: PixelGridProps) {
  const [selectedColor, setSelectedColor] = useState('#FF0000');
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ x: number; y: number } | null>(null);
  const [pixels, setPixels] = useState<Map<string, Pixel>>(new Map());
  const [recentlyPlaced, setRecentlyPlaced] = useState<Set<string>>(new Set());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const zoom = ZOOM_LEVELS[zoomIndex];
  const cellSize = CELL_SIZE * zoom;
  const gridSize = canvas.size * cellSize;

  // Initialize pixels from canvas prop
  useEffect(() => {
    const pixelMap = new Map<string, Pixel>();
    canvas.pixels.forEach((pixel) => {
      pixelMap.set(`${pixel.x},${pixel.y}`, pixel);
    });
    setPixels(pixelMap);
  }, [canvas.pixels]);

  // Subscribe to WebSocket updates
  useEffect(() => {
    if (!onWebSocketMessage) return;
    
    const cleanup = onWebSocketMessage((pixel: Pixel) => {
      const key = `${pixel.x},${pixel.y}`;
      setPixels((prev) => {
        const next = new Map(prev);
        next.set(key, pixel);
        return next;
      });
      
      // Mark as recently placed for animation
      setRecentlyPlaced((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
      
      // Remove animation after delay
      setTimeout(() => {
        setRecentlyPlaced((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }, 500);
    });
    
    return cleanup;
  }, [onWebSocketMessage]);

  // Draw grid
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    // Clear with gradient background
    const gradient = ctx.createLinearGradient(0, 0, gridSize, gridSize);
    gradient.addColorStop(0, '#0d0d1a');
    gradient.addColorStop(1, '#1a0d2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, gridSize, gridSize);

    // Draw grid lines
    ctx.strokeStyle = '#1a1a3e';
    ctx.lineWidth = 1;
    for (let i = 0; i <= canvas.size; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, gridSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(gridSize, i * cellSize);
      ctx.stroke();
    }

    // Draw pixels with glow for recent ones
    pixels.forEach((pixel) => {
      const key = `${pixel.x},${pixel.y}`;
      const isRecent = recentlyPlaced.has(key);
      
      if (isRecent) {
        // Glow effect for recently placed
        ctx.shadowColor = pixel.color;
        ctx.shadowBlur = 15;
      }
      
      ctx.fillStyle = pixel.color;
      ctx.fillRect(
        pixel.x * cellSize + 1, 
        pixel.y * cellSize + 1, 
        cellSize - 2, 
        cellSize - 2
      );
      
      // Reset shadow
      ctx.shadowBlur = 0;
    });

    // Highlight hovered cell
    if (hoveredCell) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        hoveredCell.x * cellSize + 1,
        hoveredCell.y * cellSize + 1,
        cellSize - 2,
        cellSize - 2
      );
    }

    // Highlight selected cell with animated border
    if (selectedCell) {
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        selectedCell.x * cellSize,
        selectedCell.y * cellSize,
        cellSize,
        cellSize
      );
      ctx.setLineDash([]);
      
      // Fill preview
      ctx.fillStyle = selectedColor + '40';
      ctx.fillRect(
        selectedCell.x * cellSize + 1,
        selectedCell.y * cellSize + 1,
        cellSize - 2,
        cellSize - 2
      );
    }
  }, [pixels, hoveredCell, selectedCell, zoom, canvas.size, cellSize, gridSize, selectedColor, recentlyPlaced]);

  const getGridCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return null;
      const x = Math.floor((e.clientX - rect.left) / cellSize);
      const y = Math.floor((e.clientY - rect.top) / cellSize);
      if (x >= 0 && x < canvas.size && y >= 0 && y < canvas.size) {
        return { x, y };
      }
      return null;
    },
    [cellSize, canvas.size]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const coords = getGridCoords(e);
      setHoveredCell(coords);
    },
    [getGridCoords]
  );

  const handleMouseLeave = () => {
    setHoveredCell(null);
  };

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const coords = getGridCoords(e);
      if (coords) {
        setSelectedCell(coords);
      }
    },
    [getGridCoords]
  );

  const handlePlacePixel = () => {
    if (!selectedCell) return;
    
    const key = `${selectedCell.x},${selectedCell.y}`;
    const newPixel: Pixel = {
      x: selectedCell.x,
      y: selectedCell.y,
      color: selectedColor,
      agentId: currentAgentId,
      timestamp: Date.now(),
    };
    
    // Update local state with animation
    setPixels((prev) => {
      const next = new Map(prev);
      next.set(key, newPixel);
      return next;
    });
    
    setRecentlyPlaced((prev) => {
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    
    setTimeout(() => {
      setRecentlyPlaced((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }, 500);
    
    onPixelPlace?.(selectedCell.x, selectedCell.y, selectedColor);
    setSelectedCell(null);
  };

  const handleZoomIn = () => {
    setZoomIndex((prev) => Math.min(prev + 1, ZOOM_LEVELS.length - 1));
  };

  const handleZoomOut = () => {
    setZoomIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleExportPNG = () => {
    const exportCanvas = document.createElement('canvas');
    const exportCellSize = 16;
    exportCanvas.width = canvas.size * exportCellSize;
    exportCanvas.height = canvas.size * exportCellSize;
    
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    pixels.forEach((pixel) => {
      ctx.fillStyle = pixel.color;
      ctx.fillRect(
        pixel.x * exportCellSize,
        pixel.y * exportCellSize,
        exportCellSize,
        exportCellSize
      );
    });

    const link = document.createElement('a');
    link.download = `pixelmolt-${canvas.id}-${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  const hoveredPixel = hoveredCell ? pixels.get(`${hoveredCell.x},${hoveredCell.y}`) : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-gray-800/50 backdrop-blur rounded-xl px-4 py-3 border border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-700/50 rounded-lg p-1">
            <button
              onClick={handleZoomOut}
              disabled={zoomIndex === 0}
              className="w-8 h-8 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center justify-center text-white font-bold transition-colors"
            >
              −
            </button>
            <span className="text-gray-300 text-sm w-14 text-center font-mono">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoomIndex === ZOOM_LEVELS.length - 1}
              className="w-8 h-8 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center justify-center text-white font-bold transition-colors"
            >
              +
            </button>
          </div>
          
          <div className="hidden sm:block text-gray-500 text-xs">
            🖱️ Click to select • 🎨 Choose color • ✨ Place!
          </div>
        </div>
        
        <button
          onClick={handleExportPNG}
          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-sm px-4 py-2 rounded-lg transition-all hover:shadow-lg hover:shadow-green-500/25 flex items-center gap-2"
        >
          <span>📥</span> Export
        </button>
      </div>

      {/* Main Grid + Sidebar */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Canvas Container */}
        <div className="flex-1">
          <div
            ref={containerRef}
            className="overflow-auto border-2 border-gray-700/50 rounded-xl bg-gray-900/50 backdrop-blur"
            style={{ maxHeight: '500px' }}
          >
            <canvas
              ref={canvasRef}
              width={gridSize}
              height={gridSize}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onClick={handleClick}
              className="cursor-crosshair"
            />
          </div>

          {/* Info Bar */}
          <div className="bg-gray-800/50 backdrop-blur rounded-xl px-4 py-2 mt-3 text-sm border border-gray-700/50">
            {hoveredCell ? (
              <div className="flex items-center gap-4 text-gray-300">
                <span className="font-mono text-purple-400">
                  📍 ({hoveredCell.x}, {hoveredCell.y})
                </span>
                {hoveredPixel ? (
                  <>
                    <span className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded border border-gray-600"
                        style={{ backgroundColor: hoveredPixel.color }}
                      />
                      <span className="font-mono text-xs">{hoveredPixel.color}</span>
                    </span>
                    <span className="text-gray-500">by</span>
                    <span className="text-purple-400 text-xs">{hoveredPixel.agentId}</span>
                    <span className="text-gray-600 text-xs ml-auto">
                      {new Date(hoveredPixel.timestamp).toLocaleString()}
                    </span>
                  </>
                ) : (
                  <span className="text-gray-500 italic">Empty cell</span>
                )}
              </div>
            ) : (
              <span className="text-gray-500">Hover over a cell to see details</span>
            )}
          </div>

          {/* Selected Cell Action */}
          {selectedCell && (
            <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-500/50 rounded-xl px-4 py-3 mt-3 flex items-center justify-between animate-slide-in">
              <span className="text-purple-200 flex items-center gap-2">
                <span className="text-xl">✨</span>
                <span>Place at <span className="font-mono">({selectedCell.x}, {selectedCell.y})</span></span>
              </span>
              <div className="flex items-center gap-3">
                <span
                  className="w-8 h-8 rounded-lg border-2 border-white/50"
                  style={{ backgroundColor: selectedColor }}
                />
                <button
                  onClick={handlePlacePixel}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white px-5 py-2 rounded-lg transition-all hover:shadow-lg hover:shadow-purple-500/25 font-semibold"
                >
                  🎨 Place Pixel
                </button>
                <button
                  onClick={() => setSelectedCell(null)}
                  className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Color Picker Sidebar */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <ColorPicker
            selectedColor={selectedColor}
            onColorChange={setSelectedColor}
          />
        </div>
      </div>
    </div>
  );
}
