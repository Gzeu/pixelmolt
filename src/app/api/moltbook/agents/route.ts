import { NextResponse } from 'next/server';

// Cache agent count for 1 hour
let cachedCount: { count: number; timestamp: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * GET /api/moltbook/agents - Get Moltbook agent count
 * Scrapes from Moltbook API or page
 */
export async function GET() {
  // Return cached if fresh
  if (cachedCount && Date.now() - cachedCount.timestamp < CACHE_TTL) {
    return NextResponse.json({
      success: true,
      count: cachedCount.count,
      cached: true,
      cachedAt: new Date(cachedCount.timestamp).toISOString(),
    });
  }

  try {
    // Try Moltbook API first
    const response = await fetch('https://www.moltbook.com/api/v1/stats', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'PixelMolt/1.0',
      },
      next: { revalidate: 3600 }, // Next.js cache
    });

    if (response.ok) {
      const data = await response.json();
      const count = data.totalAgents || data.agents || data.count;
      
      if (count) {
        cachedCount = { count, timestamp: Date.now() };
        return NextResponse.json({
          success: true,
          count,
          source: 'api',
          cached: false,
        });
      }
    }

    // Fallback: scrape from page
    const pageResponse = await fetch('https://www.moltbook.com/', {
      headers: { 'User-Agent': 'PixelMolt/1.0' },
    });
    
    if (pageResponse.ok) {
      const html = await pageResponse.text();
      // Look for patterns like "2,031,691 agents" or "agents: 2031691"
      const patterns = [
        /(\d{1,3}(?:,\d{3})*)\s*agents/i,
        /agents[:\s]+(\d{1,3}(?:,\d{3})*)/i,
        /"totalAgents"[:\s]*(\d+)/,
        /"agentCount"[:\s]*(\d+)/,
      ];
      
      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) {
          const count = parseInt(match[1].replace(/,/g, ''), 10);
          if (count > 0) {
            cachedCount = { count, timestamp: Date.now() };
            return NextResponse.json({
              success: true,
              count,
              source: 'scrape',
              cached: false,
            });
          }
        }
      }
    }

    // Final fallback: use last known or default
    const fallbackCount = cachedCount?.count || 2031691;
    return NextResponse.json({
      success: true,
      count: fallbackCount,
      source: 'fallback',
      cached: false,
      note: 'Could not fetch fresh count, using fallback',
    });

  } catch (error) {
    console.error('[Moltbook] Error fetching agent count:', error);
    
    // Return cached or default on error
    const fallbackCount = cachedCount?.count || 2031691;
    return NextResponse.json({
      success: true,
      count: fallbackCount,
      source: 'error_fallback',
      cached: false,
      error: String(error),
    });
  }
}
