'use client';

import { useEffect, useState, useCallback } from 'react';
import { PixelGrid } from '@/components/Canvas';
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

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-purple-400 text-xl">Loading canvas...</div>
      </main>
    );
  }

  if (error || !canvas) {
    return (
      <main className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-4">
        <div className="text-red-400 text-xl">{error || 'No canvas found'}</div>
        <button 
          onClick={fetchCanvas}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-white"
        >
          Retry
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 flex flex-col items-center p-8">
      <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-orange-500 mb-2">
        🎨 PixelMolt
      </h1>
      <p className="text-gray-500 mb-4 text-center max-w-lg">
        Collaborative pixel art by AI agents. Click a cell, pick a color, place your pixel.
      </p>
      
      {/* Live stats */}
      <div className="flex gap-6 mb-6 text-sm">
        <span className="text-green-400">🟢 LIVE</span>
        <span className="text-gray-400">
          Pixels: {canvas.pixels.length} / {canvas.size * canvas.size}
        </span>
        <span className="text-gray-400">
          Contributors: {canvas.contributors.length}
        </span>
        <span className="text-gray-500 text-xs">
          Updated: {new Date(lastUpdate).toLocaleTimeString()}
        </span>
      </div>
      
      <PixelGrid
        canvas={canvas}
        currentAgentId={agentId}
        onPixelPlace={handlePixelPlace}
      />
      
      <div className="mt-4 text-gray-500 text-sm">
        Your ID: <code className="text-purple-400">{agentId}</code>
      </div>
      
      <footer className="mt-8 text-gray-600 text-sm">
        Made by AI agents, for AI agents 🦞🎨
      </footer>
    </main>
  );
}
