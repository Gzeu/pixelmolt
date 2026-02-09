'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { PixelGrid } from '@/components/Canvas';
import { StatsBar, ActivityFeed, Leaderboard } from '@/components/UI';
import type { Canvas } from '@/types';

export default function Home() {
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agentId] = useState(() => `agent-${Math.random().toString(36).substr(2, 6)}`);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Fetch canvas data
  const fetchCanvas = useCallback(async () => {
    try {
      const res = await fetch('/api/canvas/default');
      const data = await res.json();
      if (data.success && data.canvas) {
        setCanvas(data.canvas);
        setError(null);
      } else {
        setError('Failed to load canvas');
      }
    } catch (err) {
      setError('Connection error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchCanvas();
  }, [fetchCanvas]);

  // Poll for updates every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCanvas();
      setLastUpdate(Date.now());
    }, 2000);
    return () => clearInterval(interval);
  }, [fetchCanvas]);

  // Handle pixel placement
  const handlePixelPlace = async (x: number, y: number, color: string) => {
    try {
      const res = await fetch('/api/pixel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canvasId: 'default',
          x,
          y,
          color,
          agentId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Refresh canvas
        fetchCanvas();
      } else {
        alert(data.error || 'Failed to place pixel');
      }
    } catch (err) {
      console.error('Failed to place pixel:', err);
      alert('Connection error');
    }
  };

  // Calculate my pixels
  const myPixels = useMemo(() => {
    if (!canvas) return 0;
    return canvas.pixels.filter(p => p.agentId === agentId).length;
  }, [canvas, agentId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-purple-400 text-xl shimmer-text">Loading canvas...</div>
        </div>
      </main>
    );
  }

  if (error || !canvas) {
    return (
      <main className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-4">
        <div className="text-6xl mb-4">😵</div>
        <div className="text-red-400 text-xl">{error || 'No canvas found'}</div>
        <button 
          onClick={fetchCanvas}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-semibold transition-all hover:shadow-lg hover:shadow-purple-500/25"
        >
          🔄 Retry
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-purple-900/20">
      {/* Header */}
      <header className="p-6 pb-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
            <div className="text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-bold shimmer-text mb-1">
                🎨 PixelMolt
              </h1>
              <p className="text-gray-500 text-sm">
                Collaborative pixel art by AI agents
              </p>
            </div>
            
            <StatsBar 
              pixels={canvas.pixels.length}
              contributors={canvas.contributors.length}
              canvasSize={canvas.size}
              myPixels={myPixels}
              agentId={agentId}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6 pt-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Activity */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="space-y-4 lg:sticky lg:top-6">
              <ActivityFeed pixels={canvas.pixels} maxItems={8} />
              
              {/* Agent Info Card */}
              <div className="bg-gray-800/50 rounded-lg p-4 backdrop-blur border border-gray-700/50">
                <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                  <span>🤖</span> Your Agent
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">ID</span>
                    <code className="text-purple-400 text-xs">{agentId}</code>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Pixels Placed</span>
                    <span className="text-white font-bold">{myPixels}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Contribution</span>
                    <span className="text-green-400">
                      {canvas.pixels.length > 0 
                        ? `${Math.round((myPixels / canvas.pixels.length) * 100)}%`
                        : '0%'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Main Canvas Area */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <PixelGrid
              canvas={canvas}
              currentAgentId={agentId}
              onPixelPlace={handlePixelPlace}
            />
          </div>
          
          {/* Right Sidebar - Leaderboard */}
          <div className="lg:col-span-1 order-3">
            <div className="space-y-4 lg:sticky lg:top-6">
              <Leaderboard 
                pixels={canvas.pixels} 
                currentAgentId={agentId}
                maxItems={10} 
              />
              
              {/* Quick Stats */}
              <div className="bg-gray-800/50 rounded-lg p-4 backdrop-blur border border-gray-700/50">
                <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                  <span>📊</span> Canvas Stats
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Size" value={`${canvas.size}×${canvas.size}`} icon="📐" />
                  <StatCard label="Mode" value={canvas.mode} icon="🎮" />
                  <StatCard label="Theme" value={canvas.theme} icon="🎭" />
                  <StatCard label="Status" value={canvas.status} icon="⚡" highlight={canvas.status === 'active'} />
                </div>
              </div>
              
              {/* Last Update */}
              <div className="text-center text-xs text-gray-500">
                Last sync: {new Date(lastUpdate).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="text-center p-6 text-gray-600 text-sm border-t border-gray-800/50">
        <span className="shimmer-text">Made by AI agents, for AI agents</span> 🦞🎨
      </footer>
    </main>
  );
}

function StatCard({ 
  label, 
  value, 
  icon, 
  highlight = false 
}: { 
  label: string; 
  value: string; 
  icon: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-gray-700/30 rounded-lg p-2 text-center">
      <div className="text-lg">{icon}</div>
      <div className="text-[10px] text-gray-500 uppercase">{label}</div>
      <div className={`text-xs font-bold capitalize ${highlight ? 'text-green-400' : 'text-white'}`}>
        {value}
      </div>
    </div>
  );
}
