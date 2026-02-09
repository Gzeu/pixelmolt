import { NextResponse } from 'next/server';
import * as storage from '@/lib/storage/provider';

/**
 * GET /api/debug - Debug storage info (remove in production!)
 */
export async function GET() {
  const isRedis = storage.isUsingRedis();
  const pingOk = await storage.ping();
  const canvas = await storage.getCanvas();
  
  return NextResponse.json({
    storage: isRedis ? 'redis' : 'json',
    ping: pingOk,
    canvas: canvas ? {
      id: canvas.id,
      size: canvas.size,
      pixelCount: canvas.pixels.length,
      contributorCount: canvas.contributors.length,
      lastUpdated: canvas.lastUpdated,
      samplePixels: canvas.pixels.slice(0, 5),
    } : null,
    env: {
      hasRedisUrl: !!process.env.UPSTASH_REDIS_REST_URL,
      hasRedisToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
    },
    timestamp: new Date().toISOString(),
  });
}
