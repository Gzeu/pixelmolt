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
const CELL_SIZE = 16; // base cell size in pixels

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
      setPixels((prev) => {
        const next = new Map(prev);
        next.set(`${pixel.x},${pixel.y}`, pixel);
        return next;
      });
    });
    
    return cleanup;
  }, [onWebSocketMessage]);

  // Draw grid
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, gridSize, gridSize);

    // Draw pixels
    pixels.forEach((pixel) => {
      ctx.fillStyle = pixel.color;
      ctx.fillRect(pixel.x * cellSize, pixel.y * cellSize, cellSize - 1, cellSize - 1);
    });

    // Draw empty cells with subtle border
    ctx.strokeStyle = '#2a2a3e';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.size; x++) {
      for (let y = 0; y < canvas.size; y++) {
        if (!pixels.has(`${x},${y}`)) {
          ctx.fillStyle = '#0d0d1a';
          ctx.fillRect(x * cellSize, y * cellSize, cellSize - 1, cellSize - 1);
        }
        ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }

    // Highlight hovered cell
    if (hoveredCell) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        hoveredCell.x * cellSize,
        hoveredCell.y * cellSize,
        cellSize,
        cellSize
      );
    }

    // Highlight selected cell
    if (selectedCell) {
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(
        selectedCell.x * cellSize,
        selectedCell.y * cellSize,
        cellSize,
        cellSize
      );
    }
  }, [pixels, hoveredCell, selectedCell, zoom, canvas.size, cellSize, gridSize, selectedColor]);

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
    
    const newPixel: Pixel = {
      x: selectedCell.x,
      y: selectedCell.y,
      color: selectedColor,
      agentId: currentAgentId,
      timestamp: Date.now(),
    };
    
    // Update local state
    setPixels((prev) => {
      const next = new Map(prev);
      next.set(`${newPixel.x},${newPixel.y}`, newPixel);
      return next;
    });
    
    // Notify parent
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

    // Background
    ctx.fillStyle = '#0d0d1a';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Draw pixels
    pixels.forEach((pixel) => {
      ctx.fillStyle = pixel.color;
      ctx.fillRect(
        pixel.x * exportCellSize,
        pixel.y * exportCellSize,
        exportCellSize,
        exportCellSize
      );
    });

    // Download
    const link = document.createElement('a');
    link.download = `pixelmolt-${canvas.id}-${Date.now()}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  };

  const hoveredPixel = hoveredCell ? pixels.get(`${hoveredCell.x},${hoveredCell.y}`) : null;

  return (
    <div className="flex gap-6">
      {/* Main Grid Area */}
      <div className="flex flex-col gap-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              disabled={zoomIndex === 0}
              className="w-8 h-8 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded flex items-center justify-center text-white"
            >
              −
            </button>
            <span className="text-gray-300 text-sm w-16 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoomIndex === ZOOM_LEVELS.length - 1}
              className="w-8 h-8 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded flex items-center justify-center text-white"
            >
              +
            </button>
          </div>
          
          <div className="text-gray-400 text-sm">
            {canvas.size}×{canvas.size} • {pixels.size} pixels placed
          </div>
          
          <button
            onClick={handleExportPNG}
            className="bg-green-600 hover:bg-green-500 text-white text-sm px-4 py-1.5 rounded transition-colors"
          >
            Export PNG
          </button>
        </div>

        {/* Canvas Container */}
        <div
          ref={containerRef}
          className="overflow-auto border border-gray-700 rounded-lg bg-gray-900"
          style={{ maxWidth: '600px', maxHeight: '600px' }}
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
        <div className="bg-gray-800 rounded-lg px-4 py-2 text-sm">
          {hoveredCell ? (
            <div className="flex items-center gap-4 text-gray-300">
              <span>
                Position: ({hoveredCell.x}, {hoveredCell.y})
              </span>
              {hoveredPixel && (
                <>
                  <span className="flex items-center gap-1">
                    Color:
                    <span
                      className="inline-block w-4 h-4 rounded border border-gray-600"
                      style={{ backgroundColor: hoveredPixel.color }}
                    />
                    {hoveredPixel.color}
                  </span>
                  <span>Owner: {hoveredPixel.agentId}</span>
                </>
              )}
            </div>
          ) : (
            <span className="text-gray-500">Hover over a cell to see details</span>
          )}
        </div>

        {/* Selected Cell Action */}
        {selectedCell && (
          <div className="bg-purple-900/50 border border-purple-500 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-purple-200">
              Selected: ({selectedCell.x}, {selectedCell.y})
            </span>
            <div className="flex items-center gap-2">
              <span
                className="w-6 h-6 rounded border border-gray-500"
                style={{ backgroundColor: selectedColor }}
              />
              <button
                onClick={handlePlacePixel}
                className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-1.5 rounded transition-colors"
              >
                Place Pixel
              </button>
              <button
                onClick={() => setSelectedCell(null)}
                className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1.5 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="w-64 flex flex-col gap-4">
        <ColorPicker
          selectedColor={selectedColor}
          onColorChange={setSelectedColor}
        />
        
        {/* Canvas Info */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-white font-semibold text-sm mb-3">Canvas Info</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">ID</span>
              <span className="text-gray-200 font-mono text-xs">{canvas.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Mode</span>
              <span className="text-gray-200 capitalize">{canvas.mode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Theme</span>
              <span className="text-gray-200">{canvas.theme}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Status</span>
              <span className={`capitalize ${
                canvas.status === 'active' ? 'text-green-400' :
                canvas.status === 'paused' ? 'text-yellow-400' :
                'text-gray-400'
              }`}>
                {canvas.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Contributors</span>
              <span className="text-gray-200">{canvas.contributors.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
