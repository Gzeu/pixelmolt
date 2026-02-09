// Persistent canvas storage for PixelMolt
// Uses JSON file for persistence across dev server restarts

import { Canvas, Pixel } from '@/types';
import * as fs from 'fs';
import * as path from 'path';

// File path for persistence
const DATA_DIR = process.cwd();
const CANVAS_FILE = path.join(DATA_DIR, 'canvas-data.json');

// Rate limit: 1 pixel per second per agent (fast for testing)
const RATE_LIMIT_MS = 1000;

// In-memory rate limits (these can reset, that's fine)
const rateLimits = new Map<string, number>();

// Default canvas ID
const DEFAULT_CANVAS_ID = 'default';

interface StorageData {
  canvases: Record<string, Canvas>;
  lastSaved: number;
}

/**
 * Load canvases from file
 */
function loadFromFile(): Record<string, Canvas> {
  try {
    if (fs.existsSync(CANVAS_FILE)) {
      const data = fs.readFileSync(CANVAS_FILE, 'utf-8');
      const parsed: StorageData = JSON.parse(data);
      console.log(`[PixelMolt] Loaded ${Object.keys(parsed.canvases).length} canvases from file`);
      return parsed.canvases;
    }
  } catch (err) {
    console.error('[PixelMolt] Error loading canvas file:', err);
  }
  return {};
}

/**
 * Save canvases to file
 */
function saveToFile(canvases: Record<string, Canvas>): void {
  try {
    const data: StorageData = {
      canvases,
      lastSaved: Date.now(),
    };
    fs.writeFileSync(CANVAS_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('[PixelMolt] Error saving canvas file:', err);
  }
}

// Load on startup
let canvasStore: Record<string, Canvas> = loadFromFile();

/**
 * Initialize default canvas if needed
 */
function ensureDefaultCanvas(): void {
  if (!canvasStore[DEFAULT_CANVAS_ID]) {
    canvasStore[DEFAULT_CANVAS_ID] = {
      id: DEFAULT_CANVAS_ID,
      size: 64,
      mode: 'freeform',
      theme: 'consciousness',
      status: 'active',
      pixels: [],
      contributors: [],
    };
    saveToFile(canvasStore);
  }
}

/**
 * Generate a unique canvas ID
 */
function generateCanvasId(): string {
  return `canvas_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Create a new canvas
 */
export function createCanvas(options: {
  size?: number;
  mode?: Canvas['mode'];
  theme?: string;
}): Canvas {
  ensureDefaultCanvas();
  
  const id = generateCanvasId();
  const canvas: Canvas = {
    id,
    size: options.size ?? 64,
    mode: options.mode ?? 'freeform',
    theme: options.theme ?? 'default',
    status: 'active',
    pixels: [],
    contributors: [],
  };
  
  canvasStore[id] = canvas;
  saveToFile(canvasStore);
  return canvas;
}

/**
 * Get a canvas by ID
 */
export function getCanvas(id: string): Canvas | null {
  ensureDefaultCanvas();
  return canvasStore[id] ?? null;
}

/**
 * List all active canvases
 */
export function listCanvases(): Canvas[] {
  ensureDefaultCanvas();
  return Object.values(canvasStore).filter(c => c.status === 'active');
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
export function checkRateLimit(agentId: string): { allowed: boolean; waitMs: number } {
  const lastPlace = rateLimits.get(agentId);
  const now = Date.now();
  
  if (!lastPlace) {
    return { allowed: true, waitMs: 0 };
  }
  
  const elapsed = now - lastPlace;
  if (elapsed >= RATE_LIMIT_MS) {
    return { allowed: true, waitMs: 0 };
  }
  
  return { allowed: false, waitMs: RATE_LIMIT_MS - elapsed };
}

/**
 * Place a pixel on a canvas
 */
export function placePixel(options: {
  canvasId: string;
  x: number;
  y: number;
  color: string;
  agentId: string;
  message?: string;
}): { success: boolean; error?: string; pixel?: Pixel; canvas?: { filled: number; total: number; percentage: number } } {
  ensureDefaultCanvas();
  
  const { canvasId, x, y, color, agentId, message } = options;
  
  // Get canvas
  const canvas = canvasStore[canvasId];
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
  const rateCheck = checkRateLimit(agentId);
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
    message: message?.slice(0, 100), // Max 100 chars
  };
  
  // Remove any existing pixel at this position
  const existingIndex = canvas.pixels.findIndex(p => p.x === x && p.y === y);
  if (existingIndex !== -1) {
    canvas.pixels.splice(existingIndex, 1);
  }
  
  // Add new pixel
  canvas.pixels.push(pixel);
  
  // Track contributor
  if (!canvas.contributors.includes(agentId)) {
    canvas.contributors.push(agentId);
  }
  
  // Update rate limit
  rateLimits.set(agentId, Date.now());
  
  // Save to file
  saveToFile(canvasStore);
  
  // Calculate stats
  const filled = canvas.pixels.length;
  const total = canvas.size * canvas.size;
  const percentage = Math.round((filled / total) * 10000) / 100;
  
  return {
    success: true,
    pixel,
    canvas: { filled, total, percentage },
  };
}

/**
 * Get canvas statistics
 */
export function getCanvasStats(canvasId: string): { filled: number; total: number; percentage: number } | null {
  const canvas = canvasStore[canvasId];
  if (!canvas) return null;
  
  const filled = canvas.pixels.length;
  const total = canvas.size * canvas.size;
  const percentage = Math.round((filled / total) * 10000) / 100;
  
  return { filled, total, percentage };
}
