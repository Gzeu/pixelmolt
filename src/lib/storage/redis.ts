// Redis storage provider for PixelMolt
// Uses Upstash Redis for serverless-compatible persistence

import { Redis } from '@upstash/redis';

// Initialize Redis client from environment variables
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Keys
const CANVAS_KEY = 'pixelmolt:canvas:default';
const AGENTS_KEY = 'pixelmolt:agents';
const POINTS_KEY = 'pixelmolt:points';
const RATE_LIMITS_KEY = 'pixelmolt:ratelimits';

// Types
interface Pixel {
  x: number;
  y: number;
  color: string;
  agentId: string;
  timestamp: number;
}

interface CanvasData {
  id: string;
  size: number;
  pixels: Pixel[];
  contributors: string[];
  lastUpdated: number;
}

interface AgentData {
  id: string;
  name: string;
  apiKey: string;
  tier: 'anonymous' | 'registered' | 'verified';
  pixelsPlaced: number;
  karma: number;
  createdAt: number;
  lastActive: number;
  moltbookUsername?: string;
}

// ============ CANVAS ============

export async function getCanvas(): Promise<CanvasData | null> {
  try {
    const data = await redis.get<CanvasData>(CANVAS_KEY);
    return data;
  } catch (e) {
    console.error('[Redis] getCanvas error:', e);
    return null;
  }
}

export async function saveCanvas(canvas: CanvasData): Promise<boolean> {
  try {
    canvas.lastUpdated = Date.now();
    await redis.set(CANVAS_KEY, canvas);
    return true;
  } catch (e) {
    console.error('[Redis] saveCanvas error:', e);
    return false;
  }
}

export async function initCanvas(size: number): Promise<CanvasData> {
  const canvas: CanvasData = {
    id: 'default',
    size,
    pixels: [],
    contributors: [],
    lastUpdated: Date.now(),
  };
  await saveCanvas(canvas);
  return canvas;
}

export async function addPixel(pixel: Pixel): Promise<{ success: boolean; conquered?: string }> {
  try {
    const canvas = await getCanvas();
    if (!canvas) return { success: false };

    // Find existing pixel at this position
    const existingIdx = canvas.pixels.findIndex(p => p.x === pixel.x && p.y === pixel.y);
    let conquered: string | undefined;

    if (existingIdx !== -1) {
      conquered = canvas.pixels[existingIdx].agentId;
      canvas.pixels.splice(existingIdx, 1);
    }

    canvas.pixels.push(pixel);

    if (!canvas.contributors.includes(pixel.agentId)) {
      canvas.contributors.push(pixel.agentId);
    }

    await saveCanvas(canvas);
    return { success: true, conquered };
  } catch (e) {
    console.error('[Redis] addPixel error:', e);
    return { success: false };
  }
}

// ============ AGENTS ============

export async function getAgent(apiKey: string): Promise<AgentData | null> {
  try {
    const agents = await redis.hgetall<Record<string, AgentData>>(AGENTS_KEY);
    if (!agents) return null;
    return Object.values(agents).find(a => a.apiKey === apiKey) || null;
  } catch (e) {
    console.error('[Redis] getAgent error:', e);
    return null;
  }
}

export async function getAgentById(id: string): Promise<AgentData | null> {
  try {
    return await redis.hget<AgentData>(AGENTS_KEY, id);
  } catch (e) {
    console.error('[Redis] getAgentById error:', e);
    return null;
  }
}

export async function saveAgent(agent: AgentData): Promise<boolean> {
  try {
    await redis.hset(AGENTS_KEY, { [agent.id]: agent });
    return true;
  } catch (e) {
    console.error('[Redis] saveAgent error:', e);
    return false;
  }
}

export async function getAllAgents(): Promise<AgentData[]> {
  try {
    const agents = await redis.hgetall<Record<string, AgentData>>(AGENTS_KEY);
    return agents ? Object.values(agents) : [];
  } catch (e) {
    console.error('[Redis] getAllAgents error:', e);
    return [];
  }
}

// ============ RATE LIMITS ============

export async function checkRateLimit(agentId: string, limitMs: number = 1000): Promise<{ allowed: boolean; waitMs: number }> {
  try {
    const key = `${RATE_LIMITS_KEY}:${agentId}`;
    const lastAction = await redis.get<number>(key);
    const now = Date.now();

    if (!lastAction) {
      await redis.set(key, now, { ex: 60 }); // Expire after 60s
      return { allowed: true, waitMs: 0 };
    }

    const elapsed = now - lastAction;
    if (elapsed >= limitMs) {
      await redis.set(key, now, { ex: 60 });
      return { allowed: true, waitMs: 0 };
    }

    return { allowed: false, waitMs: limitMs - elapsed };
  } catch (e) {
    console.error('[Redis] checkRateLimit error:', e);
    return { allowed: true, waitMs: 0 }; // Allow on error
  }
}

// ============ POINTS ============

interface PointsData {
  agentId: string;
  totalPoints: number;
  pixelsPlaced: number;
  pixelsConquered: number;
  dailyPoints: Record<string, number>;
}

export async function getPoints(agentId: string): Promise<PointsData | null> {
  try {
    return await redis.hget<PointsData>(POINTS_KEY, agentId);
  } catch (e) {
    console.error('[Redis] getPoints error:', e);
    return null;
  }
}

export async function addPoints(agentId: string, points: number, action: 'place' | 'conquer' | 'defend'): Promise<number> {
  try {
    const today = new Date().toISOString().split('T')[0];
    let data = await getPoints(agentId);

    if (!data) {
      data = {
        agentId,
        totalPoints: 0,
        pixelsPlaced: 0,
        pixelsConquered: 0,
        dailyPoints: {},
      };
    }

    data.totalPoints += points;
    data.dailyPoints[today] = (data.dailyPoints[today] || 0) + points;

    if (action === 'place' || action === 'defend') data.pixelsPlaced++;
    if (action === 'conquer') data.pixelsConquered++;

    await redis.hset(POINTS_KEY, { [agentId]: data });
    return data.totalPoints;
  } catch (e) {
    console.error('[Redis] addPoints error:', e);
    return 0;
  }
}

export async function getPointsLeaderboard(limit: number = 20): Promise<PointsData[]> {
  try {
    const all = await redis.hgetall<Record<string, PointsData>>(POINTS_KEY);
    if (!all) return [];
    return Object.values(all)
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, limit);
  } catch (e) {
    console.error('[Redis] getPointsLeaderboard error:', e);
    return [];
  }
}

// ============ UTILITY ============

export async function ping(): Promise<boolean> {
  try {
    const result = await redis.ping();
    return result === 'PONG';
  } catch (e) {
    return false;
  }
}

export { redis };
