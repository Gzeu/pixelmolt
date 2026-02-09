import * as fs from 'fs';
import * as path from 'path';
import { getCanvas } from '../canvas/store';

const SNAPSHOTS_DIR = path.join(process.cwd(), 'snapshots');

interface AgentScore {
  agentId: string;
  pixelCount: number;
  percentage: number;
  estimatedReward: number;
}

interface DailySnapshot {
  date: string;
  timestamp: number;
  canvasSize: number;
  totalPixels: number;
  uniqueAgents: number;
  rankings: AgentScore[];
  canvasState: any[];
}

export function calculateLeaderboard(canvasId: string = 'default'): AgentScore[] {
  const canvas = getCanvas(canvasId);
  if (!canvas) return [];
  
  // Count pixels per agent
  const counts = new Map<string, number>();
  canvas.pixels.forEach(p => {
    counts.set(p.agentId, (counts.get(p.agentId) || 0) + 1);
  });
  
  const total = canvas.pixels.length || 1;
  const DAILY_EMISSION = 10000;
  
  return Array.from(counts.entries())
    .map(([agentId, pixelCount]) => ({
      agentId,
      pixelCount,
      percentage: Math.round((pixelCount / total) * 10000) / 100,
      estimatedReward: Math.round((pixelCount / total) * DAILY_EMISSION * 100) / 100
    }))
    .sort((a, b) => b.pixelCount - a.pixelCount);
}

export function createDailySnapshot(): DailySnapshot {
  const canvas = getCanvas('default')!;
  const rankings = calculateLeaderboard('default');
  const date = new Date().toISOString().split('T')[0];
  
  const snapshot: DailySnapshot = {
    date,
    timestamp: Date.now(),
    canvasSize: canvas.size,
    totalPixels: canvas.pixels.length,
    uniqueAgents: rankings.length,
    rankings,
    canvasState: canvas.pixels.map(p => ({ x: p.x, y: p.y, color: p.color, agentId: p.agentId }))
  };
  
  // Save to file
  if (!fs.existsSync(SNAPSHOTS_DIR)) {
    fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
  }
  
  const filename = path.join(SNAPSHOTS_DIR, `snapshot-${date}.json`);
  fs.writeFileSync(filename, JSON.stringify(snapshot, null, 2));
  
  return snapshot;
}

export function getLatestSnapshot(): DailySnapshot | null {
  if (!fs.existsSync(SNAPSHOTS_DIR)) return null;
  
  const files = fs.readdirSync(SNAPSHOTS_DIR)
    .filter(f => f.startsWith('snapshot-'))
    .sort()
    .reverse();
  
  if (files.length === 0) return null;
  
  const data = fs.readFileSync(path.join(SNAPSHOTS_DIR, files[0]), 'utf-8');
  return JSON.parse(data);
}
