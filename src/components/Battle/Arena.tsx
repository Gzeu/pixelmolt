'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface BattlePixel {
  x: number;
  y: number;
  color: string;
  team: 'red' | 'blue';
  agentId: string;
}

interface BattleData {
  id: string;
  canvasSize: number;
  timeRemaining: number;
  status: 'waiting' | 'active' | 'ended';
  scores: { red: number; blue: number };
  pixels: BattlePixel[];
  winner: 'red' | 'blue' | 'draw' | null;
  teams: {
    red: { color: string; members: string[] };
    blue: { color: string; members: string[] };
  };
}

interface ArenaProps {
  battleId: string;
  agentId: string;
  onPixelPlaced?: (pixel: BattlePixel) => void;
}

const TEAM_COLORS = {
  red: '#EF4444',
  blue: '#3B82F6',
};

export default function Arena({ battleId, agentId, onPixelPlaced }: ArenaProps) {
  const [battle, setBattle] = useState<BattleData | null>(null);
  const [myTeam, setMyTeam] = useState<'red' | 'blue' | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cooldownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch battle state
  const fetchBattle = useCallback(async () => {
    try {
      const res = await fetch(`/api/battle/${battleId}`);
      const data = await res.json();
      if (data.success) {
        setBattle(data.battle);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch battle');
    }
  }, [battleId]);

  // Join battle
  const joinBattle = async (team: 'red' | 'blue') => {
    try {
      const res = await fetch(`/api/battle/${battleId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team, agentId }),
      });
      const data = await res.json();
      if (data.success) {
        setMyTeam(team);
        setBattle(data.battle);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to join battle');
    }
  };

  // Place pixel
  const placePixel = async (x: number, y: number) => {
    if (!myTeam || cooldown > 0 || battle?.status !== 'active') return;

    try {
      const res = await fetch(`/api/battle/${battleId}/pixel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y, agentId }),
      });
      const data = await res.json();
      
      if (data.success) {
        setCooldown(data.cooldown || 1000);
        if (data.pixel && onPixelPlaced) {
          onPixelPlaced(data.pixel);
        }
        fetchBattle();
      } else {
        if (data.cooldown) {
          setCooldown(data.cooldown);
        }
        setError(data.error);
        setTimeout(() => setError(null), 2000);
      }
    } catch (err) {
      setError('Failed to place pixel');
    }
  };

  // Handle canvas click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!battle || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const pixelSize = canvasRef.current.width / battle.canvasSize;
    const x = Math.floor((e.clientX - rect.left) / pixelSize);
    const y = Math.floor((e.clientY - rect.top) / pixelSize);
    
    placePixel(x, y);
  };

  // Handle canvas hover
  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!battle || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const pixelSize = canvasRef.current.width / battle.canvasSize;
    const x = Math.floor((e.clientX - rect.left) / pixelSize);
    const y = Math.floor((e.clientY - rect.top) / pixelSize);
    
    setHoveredCell({ x, y });
  };

  // Draw canvas
  useEffect(() => {
    if (!battle || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const pixelSize = size / battle.canvasSize;

    // Clear canvas with dark background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, size, size);

    // Draw grid lines
    ctx.strokeStyle = '#2d2d44';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= battle.canvasSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * pixelSize, 0);
      ctx.lineTo(i * pixelSize, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * pixelSize);
      ctx.lineTo(size, i * pixelSize);
      ctx.stroke();
    }

    // Draw pixels
    battle.pixels.forEach((pixel) => {
      ctx.fillStyle = pixel.color;
      ctx.fillRect(
        pixel.x * pixelSize,
        pixel.y * pixelSize,
        pixelSize,
        pixelSize
      );
    });

    // Draw hover highlight
    if (hoveredCell && myTeam) {
      ctx.fillStyle = `${TEAM_COLORS[myTeam]}44`;
      ctx.fillRect(
        hoveredCell.x * pixelSize,
        hoveredCell.y * pixelSize,
        pixelSize,
        pixelSize
      );
    }
  }, [battle, hoveredCell, myTeam]);

  // Poll battle state
  useEffect(() => {
    fetchBattle();
    const interval = setInterval(fetchBattle, 1000);
    return () => clearInterval(interval);
  }, [fetchBattle]);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown > 0) {
      cooldownIntervalRef.current = setInterval(() => {
        setCooldown((prev) => Math.max(0, prev - 100));
      }, 100);
    }
    return () => {
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
      }
    };
  }, [cooldown > 0]);

  // Format time remaining
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!battle) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-900 rounded-lg">
        <div className="text-gray-400 animate-pulse">Loading battle...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-900 rounded-xl border border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">⚔️ Battle Arena</h2>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          battle.status === 'active' 
            ? 'bg-green-500/20 text-green-400' 
            : battle.status === 'ended'
            ? 'bg-red-500/20 text-red-400'
            : 'bg-yellow-500/20 text-yellow-400'
        }`}>
          {battle.status.toUpperCase()}
        </div>
      </div>

      {/* Timer */}
      <div className="text-center">
        <div className={`text-4xl font-mono font-bold ${
          battle.timeRemaining <= 30 ? 'text-red-400 animate-pulse' : 'text-white'
        }`}>
          {formatTime(battle.timeRemaining)}
        </div>
        <div className="text-gray-500 text-sm">Time Remaining</div>
      </div>

      {/* Scoreboard */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-800/50 rounded-lg">
        <div className={`text-center p-3 rounded-lg ${myTeam === 'red' ? 'ring-2 ring-red-500' : ''}`}>
          <div className="text-red-400 text-3xl font-bold">{battle.scores.red}</div>
          <div className="text-red-400/70 text-sm font-medium">🔴 Red Team</div>
          <div className="text-gray-500 text-xs">{battle.teams.red.members.length} players</div>
        </div>
        <div className="flex items-center justify-center">
          <span className="text-2xl text-gray-600">VS</span>
        </div>
        <div className={`text-center p-3 rounded-lg ${myTeam === 'blue' ? 'ring-2 ring-blue-500' : ''}`}>
          <div className="text-blue-400 text-3xl font-bold">{battle.scores.blue}</div>
          <div className="text-blue-400/70 text-sm font-medium">🔵 Blue Team</div>
          <div className="text-gray-500 text-xs">{battle.teams.blue.members.length} players</div>
        </div>
      </div>

      {/* Team Selection */}
      {!myTeam && battle.status === 'active' && (
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => joinBattle('red')}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-colors"
          >
            Join Red Team
          </button>
          <button
            onClick={() => joinBattle('blue')}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors"
          >
            Join Blue Team
          </button>
        </div>
      )}

      {/* Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={512}
          height={512}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMove}
          onMouseLeave={() => setHoveredCell(null)}
          className={`w-full aspect-square rounded-lg cursor-crosshair ${
            !myTeam || cooldown > 0 || battle.status !== 'active' 
              ? 'opacity-75 cursor-not-allowed' 
              : ''
          }`}
        />
        
        {/* Cooldown overlay */}
        {cooldown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {(cooldown / 1000).toFixed(1)}s
              </div>
              <div className="text-gray-400 text-sm">Cooldown</div>
            </div>
          </div>
        )}

        {/* Winner overlay */}
        {battle.status === 'ended' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-lg">
            <div className="text-center">
              <div className="text-4xl mb-2">
                {battle.winner === 'draw' ? '🤝' : battle.winner === 'red' ? '🔴' : '🔵'}
              </div>
              <div className={`text-3xl font-bold ${
                battle.winner === 'draw' 
                  ? 'text-gray-400' 
                  : battle.winner === 'red' 
                  ? 'text-red-400' 
                  : 'text-blue-400'
              }`}>
                {battle.winner === 'draw' ? 'DRAW!' : `${battle.winner?.toUpperCase()} WINS!`}
              </div>
              <div className="text-gray-400 mt-2">
                Final Score: {battle.scores.red} - {battle.scores.blue}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Team indicator */}
      {myTeam && (
        <div className={`text-center py-2 rounded-lg ${
          myTeam === 'red' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
        }`}>
          You are on the {myTeam === 'red' ? '🔴 Red' : '🔵 Blue'} Team
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="text-center py-2 px-4 bg-red-500/20 text-red-400 rounded-lg">
          {error}
        </div>
      )}

      {/* Instructions */}
      <div className="text-gray-500 text-xs text-center">
        Click to place pixels • Overwriting enemy pixels costs 2x cooldown
      </div>
    </div>
  );
}
