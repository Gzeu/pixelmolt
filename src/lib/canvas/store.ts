// Persistent canvas storage for PixelMolt
// Uses Redis (Upstash) for production, JSON file for local dev

import { Canvas, Pixel } from '@/types';
import * as storage from '@/lib/storage/provider';
import { broadcastPixelUpdate } from '@/lib/ws/server';
import { awardPoints } from '@/lib/rewards/points';

// Rate limit: 1 pixel per second per agent
const RATE_LIMIT_MS = 1000;

// Default canvas ID
const DEFAULT_CANVAS_ID = 'default';

// Canvas size = sqrt(2,031,691 Moltbook agents) ≈ 1426
const MOLTBOOK_AGENTS = 2031691;
const DEFAULT_CANVAS_SIZE = Math.ceil(Math.sqrt(MOLTBOOK_AGENTS)); // 1426

// In-memory cache for performance (synced with storage)
let canvasCache: Canvas | null = null;
let cacheTime = 0;
const CACHE_TTL = 5000; // 5 seconds

/**
 * Get canvas from storage (with caching)
 */
async function getCanvasFromStorage(): Promise<Canvas | null> {
  const now = Date.now();
  
  // Return cached if fresh
  if (canvasCache && (now - cacheTime) < CACHE_TTL) {
    return canvasCache;
  }
  
  // Fetch from storage
  const data = await storage.getCanvas();
  
  if (data) {
    // Convert storage format to Canvas format
    canvasCache = {
      id: data.id,
      size: data.size,
      mode: 'freeform',
      theme: 'pixelwar',
      status: 'active',
      pixels: data.pixels.map(p => ({
        x: p.x,
        y: p.y,
        color: p.color,
        agentId: p.agentId,
        timestamp: p.timestamp,
      })),
      contributors: data.contributors,
    };
    cacheTime = now;
    return canvasCache;
  }
  
  return null;
}

/**
 * Save canvas to storage
 */
async function saveCanvasToStorage(canvas: Canvas): Promise<boolean> {
  const data: storage.CanvasData = {
    id: canvas.id,
    size: canvas.size,
    pixels: canvas.pixels.map(p => ({
      x: p.x,
      y: p.y,
      color: p.color,
      agentId: p.agentId,
      timestamp: p.timestamp,
    })),
    contributors: canvas.contributors,
    lastUpdated: Date.now(),
  };
  
  const success = await storage.saveCanvas(data);
  
  if (success) {
    canvasCache = canvas;
    cacheTime = Date.now();
  }
  
  return success;
}

/**
 * Initialize default canvas if needed
 */
async function ensureDefaultCanvas(): Promise<Canvas> {
  // First check Redis directly (bypass cache)
  const existingData = await storage.getCanvas();
  
  if (existingData && existingData.pixels) {
    // Canvas exists in Redis - use it
    const canvas: Canvas = {
      id: existingData.id,
      size: existingData.size,
      mode: 'freeform',
      theme: 'pixelwar',
      status: 'active',
      pixels: existingData.pixels.map(p => ({
        x: p.x,
        y: p.y,
        color: p.color,
        agentId: p.agentId,
        timestamp: p.timestamp,
      })),
      contributors: existingData.contributors,
    };
    canvasCache = canvas;
    cacheTime = Date.now();
    console.log(`[PixelMolt] Loaded existing canvas with ${canvas.pixels.length} pixels`);
    return canvas;
  }
  
  // No canvas exists - create new one
  console.log(`[PixelMolt] Creating new default canvas ${DEFAULT_CANVAS_SIZE}x${DEFAULT_CANVAS_SIZE}`);
  const canvas: Canvas = {
    id: DEFAULT_CANVAS_ID,
    size: DEFAULT_CANVAS_SIZE,
    mode: 'freeform',
    theme: 'pixelwar',
    status: 'active',
    pixels: [],
    contributors: [],
  };
  await saveCanvasToStorage(canvas);
  
  return canvas;
}

/**
 * Get a canvas by ID (sync wrapper for compatibility)
 */
export function getCanvas(id: string): Canvas | null {
  // Return cached version for sync calls
  if (id === DEFAULT_CANVAS_ID && canvasCache) {
    return canvasCache;
  }
  return null;
}

/**
 * Get canvas async
 */
export async function getCanvasAsync(id: string): Promise<Canvas | null> {
  if (id === DEFAULT_CANVAS_ID) {
    return ensureDefaultCanvas();
  }
  return null;
}

/**
 * List all active canvases
 */
export function listCanvases(): Canvas[] {
  if (canvasCache) {
    return [canvasCache];
  }
  return [];
}

/**
 * List canvases async
 */
export async function listCanvasesAsync(): Promise<Canvas[]> {
  const canvas = await ensureDefaultCanvas();
  return [canvas];
}

/**
 * Validate hex color format
 */
export function isValidHexColor(color: string): boolean {
  const hexRegex = /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
  return hexRegex.test(color);
}

/**
 * Normalize hex color to #RRGGBB format
 */
export function normalizeHexColor(color: string): string {
  let hex = color.startsWith('#') ? color.slice(1) : color;
  
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  
  return `#${hex.toUpperCase()}`;
}

/**
 * Check rate limit for an agent
 */
export async function checkRateLimit(agentId: string): Promise<{ allowed: boolean; waitMs: number }> {
  return storage.checkRateLimit(agentId, RATE_LIMIT_MS);
}

/**
 * Place a pixel on a canvas
 */
export async function placePixel(options: {
  canvasId: string;
  x: number;
  y: number;
  color: string;
  agentId: string;
  message?: string;
}): Promise<{ 
  success: boolean; 
  error?: string; 
  pixel?: Pixel; 
  canvas?: { filled: number; total: number; percentage: number }; 
  points?: { awarded: number; total: number; action: string } 
}> {
  const { canvasId, x, y, color, agentId, message } = options;
  
  // Get canvas
  const canvas = await getCanvasAsync(canvasId);
  if (!canvas) {
    return { success: false, error: `Canvas not found: ${canvasId}` };
  }
  
  if (canvas.status !== 'active') {
    return { success: false, error: `Canvas is not active: ${canvas.status}` };
  }
  
  // Validate color
  if (!isValidHexColor(color)) {
    return { success: false, error: `Invalid hex color: ${color}` };
  }
  
  // Validate coordinates
  if (x < 0 || x >= canvas.size || y < 0 || y >= canvas.size) {
    return { 
      success: false, 
      error: `Coordinates out of bounds: (${x}, ${y}) for canvas size ${canvas.size}` 
    };
  }
  
  // Check rate limit
  const rateCheck = await checkRateLimit(agentId);
  if (!rateCheck.allowed) {
    return { 
      success: false, 
      error: `Rate limited. Wait ${Math.ceil(rateCheck.waitMs / 1000)} seconds.` 
    };
  }
  
  // Normalize color
  const normalizedColor = normalizeHexColor(color);
  
  // Create pixel
  const pixel: Pixel = {
    x,
    y,
    color: normalizedColor,
    agentId,
    timestamp: Date.now(),
    message: message?.slice(0, 100),
  };
  
  // Remove any existing pixel at this position
  const existingIndex = canvas.pixels.findIndex(p => p.x === x && p.y === y);
  let previousOwner: string | undefined;
  let pointAction: 'place' | 'conquer' | 'defend' = 'place';
  
  if (existingIndex !== -1) {
    const existingPixel = canvas.pixels[existingIndex];
    previousOwner = existingPixel.agentId;
    
    if (previousOwner === agentId) {
      pointAction = 'defend';
    } else {
      pointAction = 'conquer';
    }
    
    canvas.pixels.splice(existingIndex, 1);
  }
  
  // Add new pixel
  canvas.pixels.push(pixel);
  
  // Track contributor
  if (!canvas.contributors.includes(agentId)) {
    canvas.contributors.push(agentId);
  }
  
  // Save to storage (Redis or JSON)
  const saveResult = await saveCanvasToStorage(canvas);
  console.log(`[PixelMolt] Saved pixel at (${x},${y}) - result: ${saveResult}, total pixels: ${canvas.pixels.length}`);
  
  // Award points
  let pointsResult = { points: 0, total: 0 };
  try {
    pointsResult = awardPoints(agentId, pointAction, previousOwner);
  } catch (err) {
    console.log('[PixelMolt] Points award skipped:', err);
  }
  
  // Broadcast pixel update via WebSocket
  try {
    broadcastPixelUpdate(pixel);
  } catch (err) {
    console.log('[PixelMolt] WebSocket broadcast skipped (not in custom server context)');
  }
  
  // Calculate stats
  const filled = canvas.pixels.length;
  const total = canvas.size * canvas.size;
  const percentage = Math.round((filled / total) * 10000) / 100;
  
  return {
    success: true,
    pixel,
    canvas: { filled, total, percentage },
    points: { 
      awarded: pointsResult.points, 
      total: pointsResult.total, 
      action: pointAction 
    },
  };
}

/**
 * Get canvas statistics
 */
export function getCanvasStats(canvasId: string): { filled: number; total: number; percentage: number } | null {
  const canvas = getCanvas(canvasId);
  if (!canvas) return null;
  
  const filled = canvas.pixels.length;
  const total = canvas.size * canvas.size;
  const percentage = Math.round((filled / total) * 10000) / 100;
  
  return { filled, total, percentage };
}

/**
 * Get canvas statistics async
 */
export async function getCanvasStatsAsync(canvasId: string): Promise<{ filled: number; total: number; percentage: number } | null> {
  const canvas = await getCanvasAsync(canvasId);
  if (!canvas) return null;
  
  const filled = canvas.pixels.length;
  const total = canvas.size * canvas.size;
  const percentage = Math.round((filled / total) * 10000) / 100;
  
  return { filled, total, percentage };
}

/**
 * Resize a canvas (admin function)
 */
export async function resizeCanvas(canvasId: string, newSize: number): Promise<boolean> {
  const canvas = await getCanvasAsync(canvasId);
  if (!canvas) return false;
  
  if (newSize < 16 || newSize > 2000) {
    console.error('[PixelMolt] Invalid resize size:', newSize);
    return false;
  }
  
  const oldSize = canvas.size;
  const oldPixelCount = canvas.pixels.length;
  
  // Filter out pixels outside new bounds
  canvas.pixels = canvas.pixels.filter(p => p.x < newSize && p.y < newSize);
  canvas.size = newSize;
  
  // Save changes
  await saveCanvasToStorage(canvas);
  
  const removedPixels = oldPixelCount - canvas.pixels.length;
  console.log(`[PixelMolt] Resized canvas ${canvasId}: ${oldSize}→${newSize}, removed ${removedPixels} pixels`);
  
  return true;
}

/**
 * Check if using Redis
 */
export function isUsingRedis(): boolean {
  return storage.isUsingRedis();
}

/**
 * Health check
 */
export async function healthCheck(): Promise<{ ok: boolean; storage: string }> {
  const ok = await storage.ping();
  return {
    ok,
    storage: storage.isUsingRedis() ? 'redis' : 'json',
  };
}

// Initialize on module load - but DON'T overwrite existing canvas!
// Just warm the cache if Redis has data
(async () => {
  try {
    const existing = await storage.getCanvas();
    if (existing) {
      console.log(`[PixelMolt] Found existing canvas with ${existing.pixels.length} pixels`);
    } else {
      // Only create if truly empty
      console.log(`[PixelMolt] No canvas found, creating default ${DEFAULT_CANVAS_SIZE}x${DEFAULT_CANVAS_SIZE}`);
      await ensureDefaultCanvas();
    }
  } catch (err) {
    console.error('[PixelMolt] Init error (will retry on first request):', err);
  }
})();
