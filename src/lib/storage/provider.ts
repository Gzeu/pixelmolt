// Storage provider - switches between JSON (dev) and Redis (prod)

import * as fs from 'fs';
import * as path from 'path';

// Check if Redis is configured
const USE_REDIS = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

// Types
export interface Pixel {
  x: number;
  y: number;
  color: string;
  agentId: string;
  timestamp: number;
}

export interface CanvasData {
  id: string;
  size: number;
  pixels: Pixel[];
  contributors: string[];
  lastUpdated: number;
}

export interface AgentData {
  id: string;
  name: string;
  apiKey: string;
  tier: 'anonymous' | 'registered' | 'verified';
  pixelsPlaced: number;
  karma: number;
  createdAt: number;
  moltbookUsername?: string;
}

// ============ JSON STORAGE (Development) ============

const DATA_DIR = process.cwd();
const CANVAS_FILE = path.join(DATA_DIR, 'canvas-data.json');
const AUTH_FILE = path.join(DATA_DIR, 'auth-data.json');

function loadJsonFile<T>(filepath: string, defaultValue: T): T {
  try {
    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    }
  } catch (e) {
    console.error(`[Storage] Error loading ${filepath}:`, e);
  }
  return defaultValue;
}

function saveJsonFile<T>(filepath: string, data: T): void {
  try {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(`[Storage] Error saving ${filepath}:`, e);
  }
}

// ============ UNIFIED API ============

export async function getCanvas(): Promise<CanvasData | null> {
  if (USE_REDIS) {
    const { getCanvas: redisGetCanvas } = await import('./redis');
    return redisGetCanvas();
  }
  
  const data = loadJsonFile<{ canvases: Record<string, CanvasData> }>(CANVAS_FILE, { canvases: {} });
  return data.canvases['default'] || null;
}

export async function saveCanvas(canvas: CanvasData): Promise<boolean> {
  if (USE_REDIS) {
    const { saveCanvas: redisSaveCanvas } = await import('./redis');
    return redisSaveCanvas(canvas);
  }
  
  const data = loadJsonFile<{ canvases: Record<string, CanvasData> }>(CANVAS_FILE, { canvases: {} });
  data.canvases[canvas.id] = canvas;
  saveJsonFile(CANVAS_FILE, data);
  return true;
}

export async function initCanvas(size: number = 1426): Promise<CanvasData> {
  const existing = await getCanvas();
  if (existing) return existing;

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
  if (USE_REDIS) {
    const { addPixel: redisAddPixel } = await import('./redis');
    return redisAddPixel(pixel);
  }

  const canvas = await getCanvas();
  if (!canvas) return { success: false };

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
}

// Rate limits (in-memory for dev, Redis for prod)
const memoryRateLimits = new Map<string, number>();

export async function checkRateLimit(agentId: string, limitMs: number = 1000): Promise<{ allowed: boolean; waitMs: number }> {
  if (USE_REDIS) {
    const { checkRateLimit: redisCheckRateLimit } = await import('./redis');
    return redisCheckRateLimit(agentId, limitMs);
  }

  const now = Date.now();
  const lastAction = memoryRateLimits.get(agentId);

  if (!lastAction || now - lastAction >= limitMs) {
    memoryRateLimits.set(agentId, now);
    return { allowed: true, waitMs: 0 };
  }

  return { allowed: false, waitMs: limitMs - (now - lastAction) };
}

// Agents
export async function getAgent(apiKey: string): Promise<AgentData | null> {
  if (USE_REDIS) {
    const { getAgent: redisGetAgent } = await import('./redis');
    return redisGetAgent(apiKey);
  }

  const data = loadJsonFile<{ agents: AgentData[] }>(AUTH_FILE, { agents: [] });
  return data.agents.find(a => a.apiKey === apiKey) || null;
}

export async function saveAgent(agent: AgentData): Promise<boolean> {
  if (USE_REDIS) {
    const { saveAgent: redisSaveAgent } = await import('./redis');
    return redisSaveAgent(agent);
  }

  const data = loadJsonFile<{ agents: AgentData[] }>(AUTH_FILE, { agents: [] });
  const idx = data.agents.findIndex(a => a.id === agent.id);
  if (idx !== -1) {
    data.agents[idx] = agent;
  } else {
    data.agents.push(agent);
  }
  saveJsonFile(AUTH_FILE, data);
  return true;
}

export async function getAllAgents(): Promise<AgentData[]> {
  if (USE_REDIS) {
    const { getAllAgents: redisGetAllAgents } = await import('./redis');
    return redisGetAllAgents();
  }

  const data = loadJsonFile<{ agents: AgentData[] }>(AUTH_FILE, { agents: [] });
  return data.agents;
}

// Utility
export function isUsingRedis(): boolean {
  return USE_REDIS;
}

export async function ping(): Promise<boolean> {
  if (USE_REDIS) {
    const { ping: redisPing } = await import('./redis');
    return redisPing();
  }
  return true;
}
