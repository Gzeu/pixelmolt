// In-memory canvas storage for PixelMolt

import { Canvas, Pixel } from '@/types';

// Global in-memory storage
const canvases = new Map<string, Canvas>();
const rateLimits = new Map<string, number>(); // agentId -> lastPlaceTime

// Rate limit: 1 pixel per 10 seconds per agent
const RATE_LIMIT_MS = 10_000;

// Default canvas ID
const DEFAULT_CANVAS_ID = 'default';

/**
 * Initialize default canvas on first load
 */
function ensureDefaultCanvas(): void {
  if (!canvases.has(DEFAULT_CANVAS_ID)) {
    canvases.set(DEFAULT_CANVAS_ID, {
      id: DEFAULT_CANVAS_ID,
      size: 64,
      mode: 'freeform',
      theme: 'consciousness',
      status: 'active',
      pixels: [],
      contributors: [],
    });
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
  
  canvases.set(id, canvas);
  return canvas;
}

/**
 * Get a canvas by ID
 */
export function getCanvas(id: string): Canvas | null {
  ensureDefaultCanvas();
  return canvases.get(id) ?? null;
}

/**
 * List all active canvases
 */
export function listCanvases(): Canvas[] {
  ensureDefaultCanvas();
  return Array.from(canvases.values()).filter(c => c.status === 'active');
}

/**
 * Validate hex color format
 */
export function isValidHexColor(color: string): boolean {
  // Accept both #RGB, #RRGGBB, and RRGGBB formats
  const hexRegex = /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
  return hexRegex.test(color);
}

/**
 * Normalize hex color to #RRGGBB format
 */
export function normalizeHexColor(color: string): string {
  let hex = color.startsWith('#') ? color.slice(1) : color;
  
  // Expand shorthand #RGB to #RRGGBB
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
}): { success: boolean; error?: string; pixel?: Pixel; canvas?: { filled: number; total: number; percentage: number } } {
  ensureDefaultCanvas();
  
  const { canvasId, x, y, color, agentId } = options;
  
  // Get canvas
  const canvas = canvases.get(canvasId);
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
  
  // Calculate stats
  const filled = canvas.pixels.length;
  const total = canvas.size * canvas.size;
  const percentage = Math.round((filled / total) * 10000) / 100; // 2 decimal places
  
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
  const canvas = canvases.get(canvasId);
  if (!canvas) return null;
  
  const filled = canvas.pixels.length;
  const total = canvas.size * canvas.size;
  const percentage = Math.round((filled / total) * 10000) / 100;
  
  return { filled, total, percentage };
}
