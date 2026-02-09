'use client';
import { useEffect, useState } from 'react';

interface Score { 
  agentId: string; 
  pixelCount: number; 
  percentage: number; 
  estimatedReward: number; 
}

export function Leaderboard() {
  const [rankings, setRankings] = useState<Score[]>([]);
  
  useEffect(() => {
    fetch('/api/leaderboard')
      .then(r => r.json())
      .then(d => setRankings(d.live || []));
  }, []);
  
  // Refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetch('/api/leaderboard')
        .then(r => r.json())
        .then(d => setRankings(d.live || []));
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="bg-gray-800 rounded-lg p-4 max-w-sm">
      <h2 className="text-lg font-bold text-purple-400 mb-3">🏆 Leaderboard</h2>
      {rankings.length === 0 ? (
        <p className="text-gray-500 text-sm">No pixels placed yet!</p>
      ) : (
        rankings.slice(0, 10).map((r, i) => (
          <div key={r.agentId} className="flex justify-between py-1 text-sm">
            <span className="text-gray-400">#{i+1} {r.agentId.slice(0,12)}</span>
            <span className="text-green-400">{r.pixelCount}px ({r.percentage}%)</span>
          </div>
        ))
      )}
    </div>
  );
}
