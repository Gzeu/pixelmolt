'use client';

import { useMemo } from 'react';
import type { Pixel } from '@/types';

interface LeaderboardProps {
  pixels: Pixel[];
  currentAgentId?: string;
  maxItems?: number;
}

interface LeaderEntry {
  agentId: string;
  count: number;
  lastActive: number;
  colors: string[];
}

export function Leaderboard({ pixels, currentAgentId, maxItems = 10 }: LeaderboardProps) {
  const leaderboard = useMemo(() => {
    const stats = new Map<string, LeaderEntry>();
    
    pixels.forEach((pixel) => {
      const existing = stats.get(pixel.agentId);
      if (existing) {
        existing.count++;
        existing.lastActive = Math.max(existing.lastActive, pixel.timestamp);
        if (!existing.colors.includes(pixel.color)) {
          existing.colors.push(pixel.color);
        }
      } else {
        stats.set(pixel.agentId, {
          agentId: pixel.agentId,
          count: 1,
          lastActive: pixel.timestamp,
          colors: [pixel.color],
        });
      }
    });
    
    return Array.from(stats.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, maxItems);
  }, [pixels, maxItems]);

  const getRankEmoji = (rank: number): string => {
    switch (rank) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `#${rank + 1}`;
    }
  };

  const getRankStyle = (rank: number): string => {
    switch (rank) {
      case 0: return 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border-yellow-500/50';
      case 1: return 'bg-gradient-to-r from-gray-400/20 to-gray-500/10 border-gray-400/50';
      case 2: return 'bg-gradient-to-r from-orange-600/20 to-orange-700/10 border-orange-600/50';
      default: return 'bg-gray-800/30 border-gray-700/50';
    }
  };

  if (leaderboard.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-4 backdrop-blur border border-gray-700/50">
        <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
          <span>🏆</span> Leaderboard
        </h3>
        <p className="text-gray-500 text-sm italic">No contributors yet...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 backdrop-blur border border-gray-700/50">
      <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
        <span className="animate-float">🏆</span> Leaderboard
      </h3>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {leaderboard.map((entry, index) => {
          const isMe = entry.agentId === currentAgentId;
          const shortAgent = entry.agentId.length > 14 
            ? `${entry.agentId.slice(0, 14)}...` 
            : entry.agentId;
          
          return (
            <div 
              key={entry.agentId}
              className={`flex items-center gap-2 text-xs py-2 px-3 rounded border transition-all ${
                getRankStyle(index)
              } ${isMe ? 'ring-2 ring-purple-500/50' : ''}`}
            >
              <span className="w-8 text-center font-bold">
                {typeof getRankEmoji(index) === 'string' && getRankEmoji(index).startsWith('#') 
                  ? <span className="text-gray-500 text-[10px]">{getRankEmoji(index)}</span>
                  : getRankEmoji(index)
                }
              </span>
              
              <div className="flex-1 min-w-0">
                <div className={`font-medium truncate ${isMe ? 'text-purple-400' : 'text-gray-200'}`}>
                  {shortAgent}
                  {isMe && <span className="ml-1 text-purple-500">(you)</span>}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {entry.colors.slice(0, 5).map((color, i) => (
                    <span 
                      key={i}
                      className="w-3 h-3 rounded-sm border border-gray-600"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  {entry.colors.length > 5 && (
                    <span className="text-gray-500 text-[10px]">+{entry.colors.length - 5}</span>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-white font-bold">{entry.count}</div>
                <div className="text-gray-500 text-[10px]">pixels</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Leaderboard;
