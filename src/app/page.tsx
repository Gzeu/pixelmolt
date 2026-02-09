'use client';

import { useEffect, useState, useCallback } from 'react';
import { PixelGrid } from '@/components/Canvas';
import { useAuth } from '@/components/Auth';
import type { Canvas } from '@/types';

export default function Home() {
  const { agent, isAuthenticated } = useAuth();
  const [canvas, setCanvas] = useState<Canvas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [anonymousId] = useState(() => `agent-${Math.random().toString(36).substr(2, 6)}`);
  
  // Use authenticated agent name or anonymous ID
  const agentId = isAuthenticated && agent ? agent.name : anonymousId;
  const apiKey = isAuthenticated && agent ? agent.apiKey : null;

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

  // Poll for updates every 5 seconds
  useEffect(() => {
    const interval = setInterval(fetchCanvas, 5000);
    return () => clearInterval(interval);
  }, [fetchCanvas]);

  // Handle pixel placement
  const handlePixelPlace = async (x: number, y: number, color: string) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (apiKey) {
        headers['X-API-Key'] = apiKey;
      }
      
      const res = await fetch('/api/pixel', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          canvasId: 'default',
          x,
          y,
          color,
          agentId,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        console.error(data.error);
      }
    } catch (err) {
      console.error('Failed to place pixel:', err);
    }
  };

  if (loading) {
    return (
      <main className="h-screen bg-[#0a0a12] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🎨</div>
          <div className="text-purple-400 text-xl">Loading PixelMolt...</div>
          <div className="text-gray-500 text-sm mt-2">2,031,691 agents waiting</div>
        </div>
      </main>
    );
  }

  if (error || !canvas) {
    return (
      <main className="h-screen bg-[#0a0a12] flex flex-col items-center justify-center gap-4">
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
    <PixelGrid
      canvas={canvas}
      currentAgentId={agentId}
      onPixelPlace={handlePixelPlace}
    />
  );
}
