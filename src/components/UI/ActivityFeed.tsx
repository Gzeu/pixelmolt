'use client';

import { useEffect, useState, useRef } from 'react';
import type { Pixel } from '@/types';

interface ActivityFeedProps {
  pixels: Pixel[];
  maxItems?: number;
}

interface ActivityItem {
  id: string;
  pixel: Pixel;
  isNew: boolean;
}

export function ActivityFeed({ pixels, maxItems = 5 }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const prevPixelsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const prevKeys = prevPixelsRef.current;
    const newActivities: ActivityItem[] = [];
    
    // Sort by timestamp descending
    const sortedPixels = [...pixels].sort((a, b) => b.timestamp - a.timestamp);
    
    sortedPixels.slice(0, maxItems).forEach((pixel) => {
      const key = `${pixel.x},${pixel.y},${pixel.timestamp}`;
      newActivities.push({
        id: key,
        pixel,
        isNew: !prevKeys.has(key),
      });
    });
    
    setActivities(newActivities);
    
    // Update previous keys
    prevPixelsRef.current = new Set(sortedPixels.slice(0, maxItems).map(p => `${p.x},${p.y},${p.timestamp}`));
  }, [pixels, maxItems]);

  if (activities.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-4 backdrop-blur border border-gray-700/50">
        <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
          <span>📡</span> Live Activity
        </h3>
        <p className="text-gray-500 text-sm italic">No activity yet...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 backdrop-blur border border-gray-700/50">
      <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
        <span className="animate-pulse">📡</span> Live Activity
      </h3>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {activities.map((activity, index) => (
          <ActivityEntry 
            key={activity.id} 
            pixel={activity.pixel} 
            isNew={activity.isNew}
            delay={index * 50}
          />
        ))}
      </div>
    </div>
  );
}

interface ActivityEntryProps {
  pixel: Pixel;
  isNew: boolean;
  delay: number;
}

function ActivityEntry({ pixel, isNew, delay }: ActivityEntryProps) {
  const timeAgo = formatTimeAgo(pixel.timestamp);
  const shortAgent = pixel.agentId.length > 12 
    ? `${pixel.agentId.slice(0, 12)}...` 
    : pixel.agentId;

  return (
    <div 
      className={`flex items-center gap-2 text-xs py-1.5 px-2 rounded transition-all duration-300 ${
        isNew ? 'animate-slide-in bg-purple-900/30 border-l-2 border-purple-500' : 'bg-gray-700/30'
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="text-base">🎨</span>
      <span className="text-gray-300 font-medium">{shortAgent}</span>
      <span className="text-gray-500">placed</span>
      <span 
        className="w-4 h-4 rounded border border-gray-600 inline-block flex-shrink-0"
        style={{ backgroundColor: pixel.color }}
        title={pixel.color}
      />
      <span className="text-gray-400 font-mono">{pixel.color}</span>
      <span className="text-gray-500">at</span>
      <span className="text-purple-400 font-mono">({pixel.x},{pixel.y})</span>
      <span className="text-gray-600 ml-auto text-[10px]">{timeAgo}</span>
    </div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default ActivityFeed;
