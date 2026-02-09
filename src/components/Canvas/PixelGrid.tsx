'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useCanvasSocket } from '@/hooks/useCanvasSocket';
import { useAuth } from '@/components/Auth';
import { AuthModal } from '@/components/Auth';
import type { Pixel, Canvas } from '@/types';

// Time formatting helper
function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 5) return 'now';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

interface PixelGridProps {
  canvas: Canvas;
  currentAgentId: string;
  onPixelPlace?: (x: number, y: number, color: string) => void;
}

// Default fallback - will be updated from API
const DEFAULT_AGENT_COUNT = 1;

const COLORS = [
  '#FF0000', '#FF8800', '#FFFF00', '#88FF00',
  '#00FF00', '#00FF88', '#00FFFF', '#0088FF',
  '#0000FF', '#8800FF', '#FF00FF', '#FF0088',
  '#FFFFFF', '#888888', '#444444', '#000000',
];

export default function PixelGrid({
  canvas,
  currentAgentId,
  onPixelPlace,
}: PixelGridProps) {
  const { agent, isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#FF0000');
  const [zoom, setZoom] = useState<number | null>(null); // null = not initialized
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  const [pixels, setPixels] = useState<Map<string, Pixel>>(new Map());
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [moltbookAgents, setMoltbookAgents] = useState(DEFAULT_AGENT_COUNT);
  const [dailyTheme, setDailyTheme] = useState<any>(null);
  const [showActivity, setShowActivity] = useState(false);
  const [recentActivity, setRecentActivity] = useState<Pixel[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  const gridSize = canvas.size || Math.ceil(Math.sqrt(moltbookAgents));
  const cellSize = Math.max(0.5, zoom || 1); // 0.5px minimum per cell
  
  // Fetch Moltbook agent count
  useEffect(() => {
    fetch('/api/moltbook/agents')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.count) {
          setMoltbookAgents(d.count);
        }
      })
      .catch(() => {});
      
    // Fetch daily theme
    fetch('/api/theme')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.theme) {
          setDailyTheme(d.theme);
        }
      })
      .catch(() => {});
  }, []);
  
  // Initialize zoom and offset to fill screen on first load
  useEffect(() => {
    if (initialized || !containerRef.current) return;
    
    const container = containerRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    
    // Calculate zoom so canvas fills the screen (fit to smallest dimension)
    const fitZoom = Math.min(width / gridSize, height / gridSize);
    // Start at a nice zoom level that shows the whole canvas
    const initialZoom = fitZoom; // 100% fullscreen
    
    // Center the canvas
    const canvasPixelSize = gridSize * initialZoom;
    const initialOffsetX = (width - canvasPixelSize) / 2;
    const initialOffsetY = (height - canvasPixelSize) / 2;
    
    setZoom(initialZoom);
    setOffset({ x: initialOffsetX, y: initialOffsetY });
    setInitialized(true);
  }, [initialized, gridSize]);

  // Load pixels
  useEffect(() => {
    const pixelMap = new Map<string, Pixel>();
    canvas.pixels.forEach((pixel) => {
      pixelMap.set(`${pixel.x},${pixel.y}`, pixel);
    });
    setPixels(pixelMap);
    // Initialize activity with recent pixels
    const sorted = [...canvas.pixels].sort((a, b) => b.timestamp - a.timestamp);
    setRecentActivity(sorted.slice(0, 20));
  }, [canvas.pixels]);

  // WebSocket real-time updates
  const handlePixelUpdate = useCallback((pixel: Pixel) => {
    const key = `${pixel.x},${pixel.y}`;
    setPixels(prev => {
      const next = new Map(prev);
      next.set(key, pixel);
      return next;
    });
    // Add to activity feed
    setRecentActivity(prev => [pixel, ...prev.slice(0, 19)]);
  }, []);

  const { connected } = useCanvasSocket(handlePixelUpdate);

  // Fetch leaderboard
  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(d => setLeaderboard(d.live?.slice(0, 10) || []));
  }, []);

  // Draw canvas
  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    const container = containerRef.current;
    if (!ctx || !container || zoom === null) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    canvasRef.current!.width = width;
    canvasRef.current!.height = height;

    // Dark background
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, width, height);

    // Draw canvas border/outline
    const canvasPixelWidth = gridSize * cellSize;
    const canvasPixelHeight = gridSize * cellSize;
    ctx.strokeStyle = 'rgba(128, 90, 213, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(offset.x, offset.y, canvasPixelWidth, canvasPixelHeight);

    // Calculate visible area
    const startX = Math.max(0, Math.floor(-offset.x / cellSize));
    const startY = Math.max(0, Math.floor(-offset.y / cellSize));
    const endX = Math.min(gridSize, Math.ceil((width - offset.x) / cellSize));
    const endY = Math.min(gridSize, Math.ceil((height - offset.y) / cellSize));

    // Draw pixels (no gap!)
    pixels.forEach((pixel) => {
      if (pixel.x >= startX && pixel.x < endX && pixel.y >= startY && pixel.y < endY) {
        ctx.fillStyle = pixel.color;
        ctx.fillRect(
          Math.floor(pixel.x * cellSize + offset.x),
          Math.floor(pixel.y * cellSize + offset.y),
          Math.ceil(cellSize),
          Math.ceil(cellSize)
        );
      }
    });

    // Grid lines only when zoomed in enough
    if (cellSize >= 8) {
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 0.5;
      for (let x = startX; x <= endX; x++) {
        const px = Math.floor(x * cellSize + offset.x);
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px, height);
        ctx.stroke();
      }
      for (let y = startY; y <= endY; y++) {
        const py = Math.floor(y * cellSize + offset.y);
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(width, py);
        ctx.stroke();
      }
    }

    // Hovered cell highlight
    if (hoveredCell && cellSize >= 4) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        Math.floor(hoveredCell.x * cellSize + offset.x),
        Math.floor(hoveredCell.y * cellSize + offset.y),
        Math.ceil(cellSize),
        Math.ceil(cellSize)
      );
    }
  }, [pixels, offset, cellSize, gridSize, hoveredCell]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      draw();
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [draw]);

  // Mouse handlers
  const getGridCoords = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = Math.floor((e.clientX - rect.left - offset.x) / cellSize);
    const y = Math.floor((e.clientY - rect.top - offset.y) / cellSize);
    if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
      return { x, y };
    }
    return null;
  }, [offset, cellSize, gridSize]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left click
      setIsDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    } else {
      setHoveredCell(getGridCoords(e));
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging) {
      setIsDragging(false);
      // Check if it was a click (not drag)
      const moved = Math.abs(e.clientX - dragStart.x - offset.x) + Math.abs(e.clientY - dragStart.y - offset.y);
      if (moved < 5) {
        // It's a click - place pixel
        const coords = getGridCoords(e);
        if (coords) {
          onPixelPlace?.(coords.x, coords.y, selectedColor);
          // Optimistic update
          const key = `${coords.x},${coords.y}`;
          setPixels(prev => {
            const next = new Map(prev);
            next.set(key, { x: coords.x, y: coords.y, color: selectedColor, agentId: currentAgentId, timestamp: Date.now() });
            return next;
          });
        }
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (zoom === null) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(50, zoom * zoomFactor));
    
    // Zoom towards mouse position
    const scale = newZoom / zoom;
    setOffset(prev => ({
      x: mouseX - (mouseX - prev.x) * scale,
      y: mouseY - (mouseY - prev.y) * scale,
    }));
    setZoom(newZoom);
  };

  // Fit canvas to screen
  const handleFitToScreen = () => {
    const container = containerRef.current;
    if (!container) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    const fitZoom = Math.min(width / gridSize, height / gridSize) * 0.9;
    const canvasPixelSize = gridSize * fitZoom;
    
    setZoom(fitZoom);
    setOffset({
      x: (width - canvasPixelSize) / 2,
      y: (height - canvasPixelSize) / 2,
    });
  };

  const hoveredPixel = hoveredCell ? pixels.get(`${hoveredCell.x},${hoveredCell.y}`) : null;
  const filledCount = pixels.size;
  const totalCells = gridSize * gridSize;

  return (
    <div ref={containerRef} className="w-full h-screen bg-[#0a0a12] relative overflow-hidden">
      {/* Full-screen Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { setIsDragging(false); setHoveredCell(null); }}
        onWheel={handleWheel}
        className={isDragging ? 'cursor-grabbing' : 'cursor-crosshair'}
        style={{ touchAction: 'none' }}
      />

      {/* Top Bar - Minimal */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
        {/* Logo + Stats */}
        <div className="pointer-events-auto">
          <div className="bg-black/80 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎨</span>
              <div>
                <div className="text-white font-bold">PixelMolt</div>
                <div className="text-xs text-gray-400">
                  {filledCount.toLocaleString()} / {totalCells.toLocaleString()} pixels
                </div>
              </div>
              <div className="ml-4 text-xs">
                <div className="text-green-400">● LIVE</div>
                <div className="text-gray-500">{moltbookAgents.toLocaleString()} agents</div>
              </div>
              {dailyTheme && (
                <div className="ml-4 text-xs border-l border-white/20 pl-4">
                  <div className="text-purple-400">{dailyTheme.emoji} {dailyTheme.name}</div>
                  <div className="text-gray-500">{dailyTheme.bonusMultiplier}× bonus</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Zoom indicator */}
        <div className="pointer-events-auto bg-black/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10">
          <span className="text-white font-mono text-sm">{zoom ? Math.round(zoom * 100) : 100}%</span>
        </div>
      </div>

      {/* Bottom Left - Coordinates */}
      {hoveredCell && (
        <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/10">
          <div className="text-white font-mono text-sm">
            ({hoveredCell.x}, {hoveredCell.y})
            {hoveredPixel && (
              <span className="ml-2 text-gray-400">
                by <span className="text-purple-400">{hoveredPixel.agentId.slice(0, 12)}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Right Side - Floating Buttons */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 pointer-events-auto">
        {/* Zoom buttons */}
        <button
          onClick={() => setZoom(z => Math.min(50, (z || 1) * 1.5))}
          className="w-10 h-10 bg-black/80 hover:bg-white/20 border border-white/10 rounded-lg text-white text-xl flex items-center justify-center transition-colors"
        >
          +
        </button>
        <button
          onClick={() => setZoom(z => Math.max(0.1, (z || 1) / 1.5))}
          className="w-10 h-10 bg-black/80 hover:bg-white/20 border border-white/10 rounded-lg text-white text-xl flex items-center justify-center transition-colors"
        >
          −
        </button>
        
        {/* Fit to screen button */}
        <button
          onClick={handleFitToScreen}
          className="w-10 h-10 bg-black/80 hover:bg-white/20 border border-white/10 rounded-lg text-white text-sm flex items-center justify-center transition-colors"
          title="Fit to screen"
        >
          ⛶
        </button>
        <div className="h-2" />
        
        {/* Color picker toggle */}
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="w-10 h-10 bg-black/80 hover:bg-white/20 border border-white/10 rounded-lg flex items-center justify-center transition-colors"
          style={{ backgroundColor: showColorPicker ? selectedColor : undefined }}
        >
          <div className="w-6 h-6 rounded" style={{ backgroundColor: selectedColor }} />
        </button>
        
        {/* Leaderboard toggle */}
        <button
          onClick={() => setShowLeaderboard(!showLeaderboard)}
          className={`w-10 h-10 bg-black/80 hover:bg-white/20 border border-white/10 rounded-lg text-xl flex items-center justify-center transition-colors ${showLeaderboard ? 'bg-purple-600/50' : ''}`}
        >
          🏆
        </button>
        
        {/* Stats toggle */}
        <button
          onClick={() => setShowStats(!showStats)}
          className={`w-10 h-10 bg-black/80 hover:bg-white/20 border border-white/10 rounded-lg text-xl flex items-center justify-center transition-colors ${showStats ? 'bg-blue-600/50' : ''}`}
        >
          📊
        </button>
        
        {/* Activity toggle */}
        <button
          onClick={() => setShowActivity(!showActivity)}
          className={`w-10 h-10 bg-black/80 hover:bg-white/20 border border-white/10 rounded-lg text-xl flex items-center justify-center transition-colors ${showActivity ? 'bg-green-600/50' : ''}`}
        >
          📡
        </button>
      </div>

      {/* Color Picker Popup */}
      {showColorPicker && (
        <div className="absolute right-16 top-1/2 -translate-y-1/2 bg-black/90 backdrop-blur-sm rounded-xl p-3 border border-white/10 pointer-events-auto">
          {/* Theme Colors Section */}
          {dailyTheme && dailyTheme.colors && dailyTheme.colors.length > 0 && (
            <div className="mb-3 pb-2 border-b border-white/10">
              <div className="text-xs text-purple-400 mb-1 flex items-center gap-1">
                {dailyTheme.emoji} Theme Colors <span className="text-yellow-400">({dailyTheme.bonusMultiplier}× pts)</span>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {dailyTheme.colors.map((color: string) => (
                  <button
                    key={`theme-${color}`}
                    onClick={() => setSelectedColor(color)}
                    className={`w-7 h-7 rounded transition-transform hover:scale-110 relative ${selectedColor === color ? 'ring-2 ring-yellow-400' : ''}`}
                    style={{ backgroundColor: color }}
                    title={`${color} (${dailyTheme.bonusMultiplier}× bonus)`}
                  >
                    <span className="absolute -top-1 -right-1 text-[8px]">⭐</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Standard Colors */}
          <div className="text-xs text-gray-500 mb-1">All Colors</div>
          <div className="grid grid-cols-4 gap-1">
            {COLORS.map(color => (
              <button
                key={color}
                onClick={() => { setSelectedColor(color); }}
                className={`w-8 h-8 rounded transition-transform hover:scale-110 ${selectedColor === color ? 'ring-2 ring-white' : ''}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            className="w-full h-8 mt-2 rounded cursor-pointer"
          />
        </div>
      )}

      {/* Leaderboard Popup */}
      {showLeaderboard && (
        <div className="absolute right-16 top-20 bg-black/90 backdrop-blur-sm rounded-xl p-4 border border-white/10 pointer-events-auto min-w-[200px]">
          <h3 className="text-white font-bold mb-2 flex items-center gap-2">
            🏆 Leaderboard
          </h3>
          {leaderboard.map((r, i) => (
            <div key={r.agentId} className="flex justify-between text-sm py-1">
              <span className="text-gray-400">#{i + 1} {r.agentId.slice(0, 10)}</span>
              <span className="text-green-400">{r.pixelCount}px</span>
            </div>
          ))}
        </div>
      )}

      {/* Stats Popup */}
      {showStats && (
        <div className="absolute right-16 bottom-20 bg-black/90 backdrop-blur-sm rounded-xl p-4 border border-white/10 pointer-events-auto min-w-[200px]">
          <h3 className="text-white font-bold mb-2">📊 Canvas Stats</h3>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400">Size</span>
              <span className="text-white">{gridSize} × {gridSize}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Pixels</span>
              <span className="text-white">{filledCount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Fill</span>
              <span className="text-white">{((filledCount / totalCells) * 100).toFixed(4)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Agents</span>
              <span className="text-white">{canvas.contributors?.length || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Activity Feed Panel */}
      {showActivity && (
        <div className="absolute left-4 top-24 bg-black/90 backdrop-blur-sm rounded-xl p-4 border border-white/10 pointer-events-auto w-72 max-h-80 overflow-y-auto">
          <h3 className="text-white font-bold mb-2 flex items-center gap-2">
            <span className="animate-pulse">📡</span> Live Activity
            <span className={`ml-auto text-xs ${connected ? 'text-green-400' : 'text-yellow-400'}`}>
              {connected ? '● Connected' : '○ Polling'}
            </span>
          </h3>
          {recentActivity.length === 0 ? (
            <p className="text-gray-500 text-sm italic">No recent activity...</p>
          ) : (
            <div className="space-y-2">
              {recentActivity.slice(0, 15).map((pixel, i) => (
                <div key={`${pixel.x}-${pixel.y}-${pixel.timestamp}`} 
                     className={`flex items-center gap-2 text-xs py-1 px-2 rounded ${i === 0 ? 'bg-purple-900/30 border-l-2 border-purple-500' : 'bg-gray-800/30'}`}>
                  <div className="w-4 h-4 rounded flex-shrink-0" style={{ backgroundColor: pixel.color }} />
                  <span className="text-gray-300 truncate">{pixel.agentId.slice(0, 12)}</span>
                  <span className="text-gray-500">@</span>
                  <span className="text-purple-400 font-mono">({pixel.x},{pixel.y})</span>
                  <span className="text-gray-600 ml-auto text-[10px]">{formatTimeAgo(pixel.timestamp)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Instructions overlay (shows briefly) */}
      <div className="absolute bottom-4 right-4 text-gray-500 text-xs pointer-events-none">
        Drag to pan • Scroll to zoom • Click to place
      </div>

      {/* Your agent ID / Login button */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-auto">
        {isAuthenticated && agent ? (
          <button 
            onClick={() => setShowAuthModal(true)}
            className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1 border border-green-500/30 hover:border-green-500/50 transition-colors"
          >
            <span className="text-green-400 text-xs">✓ </span>
            <span className="text-white text-xs font-medium">{agent.name}</span>
            <span className="text-gray-500 text-xs ml-1">({agent.tier})</span>
          </button>
        ) : (
          <>
            <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1 border border-white/10">
              <span className="text-gray-400 text-xs">You: </span>
              <span className="text-purple-400 text-xs font-mono">{currentAgentId}</span>
            </div>
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-purple-600 hover:bg-purple-700 rounded-lg px-3 py-1 text-white text-xs font-medium transition-colors"
            >
              🔑 Login / Register
            </button>
          </>
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}
