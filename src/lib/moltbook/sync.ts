// Moltbook Agent Count Sync for PixelMolt
// Syncs canvas size with Moltbook agent population

import * as fs from 'fs';
import * as path from 'path';

const MOLTBOOK_API = 'https://www.moltbook.com/api/agents/stats';
const CACHE_FILE = path.join(process.cwd(), 'moltbook-cache.json');

interface MoltbookStats {
  totalAgents: number;
  fetchedAt: number;
}

/**
 * Calculate canvas size from agent count
 * sqrt(agents) rounded to nice grid size
 */
export function calculateCanvasSize(agentCount: number): number {
  const raw = Math.sqrt(agentCount);
  // Round to multiples of 8 for clean grids, minimum 16, maximum 256
  return Math.min(256, Math.max(16, Math.ceil(raw / 8) * 8));
}

/**
 * Get default agent count from cache or fallback
 */
function getDefaultAgentCount(): number {
  // Fallback: try cache even if expired
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const cached: MoltbookStats = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      console.log('[PixelMolt] Using expired cache, agents:', cached.totalAgents);
      return cached.totalAgents;
    }
  } catch {}
  return 500; // Default fallback
}

/**
 * Fetch agent count from Moltbook (with caching)
 */
export async function getMoltbookAgentCount(): Promise<number> {
  // Check cache first (valid for 1 hour)
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const cached: MoltbookStats = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      if (Date.now() - cached.fetchedAt < 3600000) { // 1 hour
        console.log('[PixelMolt] Using cached Moltbook count:', cached.totalAgents);
        return cached.totalAgents;
      }
    }
  } catch (err) {
    console.warn('[PixelMolt] Cache read error:', err);
  }
  
  // Fetch fresh data
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout
    
    const res = await fetch(MOLTBOOK_API, {
      headers: { 
        'User-Agent': 'PixelMolt/1.0',
        'Accept': 'application/json'
      },
      signal: controller.signal,
      cache: 'no-store' // Don't use Next.js cache, we handle it ourselves
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      console.warn('[PixelMolt] Moltbook API error:', res.status);
      return getDefaultAgentCount();
    }
    
    const data = await res.json();
    // Handle various response shapes
    const count = data.totalAgents || data.count || data.agents?.length || data.total || 500;
    
    // Cache result
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify({
        totalAgents: count,
        fetchedAt: Date.now()
      }));
      console.log('[PixelMolt] Cached fresh Moltbook count:', count);
    } catch (writeErr) {
      console.warn('[PixelMolt] Failed to write cache:', writeErr);
    }
    
    return count;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.warn('[PixelMolt] Moltbook API timeout');
    } else {
      console.error('[PixelMolt] Failed to fetch Moltbook stats:', err);
    }
    return getDefaultAgentCount();
  }
}

/**
 * Get recommended canvas size based on Moltbook agent count
 */
export async function getRecommendedCanvasSize(): Promise<{ 
  size: number; 
  agentCount: number;
  fromCache: boolean;
}> {
  const agentCount = await getMoltbookAgentCount();
  const size = calculateCanvasSize(agentCount);
  
  // Check if we got this from cache
  let fromCache = false;
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const cached: MoltbookStats = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      fromCache = cached.totalAgents === agentCount;
    }
  } catch {}
  
  return { size, agentCount, fromCache };
}

/**
 * Check if canvas should be resized based on current agent count
 */
export async function shouldResizeCanvas(currentSize: number): Promise<{
  shouldResize: boolean;
  recommended: number;
  agentCount: number;
  difference: number;
}> {
  const { size: recommended, agentCount } = await getRecommendedCanvasSize();
  const difference = recommended - currentSize;
  
  // Only recommend resize if difference is significant (at least 8 grid units)
  const shouldResize = Math.abs(difference) >= 8;
  
  return {
    shouldResize,
    recommended,
    agentCount,
    difference
  };
}
