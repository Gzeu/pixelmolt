import { NextRequest, NextResponse } from 'next/server';
import { listCanvasesAsync, isUsingRedis } from '@/lib/canvas/store';
import { Canvas } from '@/types';

interface CreateCanvasRequest {
  size?: number;
  mode?: Canvas['mode'];
  theme?: string;
}

/**
 * GET /api/canvas - List all active canvases
 */
export async function GET() {
  try {
    const canvases = await listCanvasesAsync();
    
    // Return summary info (not full pixel arrays for list view)
    const summaries = canvases.map(canvas => ({
      id: canvas.id,
      size: canvas.size,
      mode: canvas.mode,
      theme: canvas.theme,
      status: canvas.status,
      pixelCount: canvas.pixels.length,
      contributorCount: canvas.contributors.length,
      fillPercentage: Math.round((canvas.pixels.length / (canvas.size * canvas.size)) * 10000) / 100,
    }));

    return NextResponse.json({
      success: true,
      canvases: summaries,
      count: summaries.length,
      storage: isUsingRedis() ? 'redis' : 'json',
    });

  } catch (error) {
    console.error('Error listing canvases:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/canvas - Create a new canvas (disabled - single canvas mode)
 */
export async function POST(request: NextRequest) {
  return NextResponse.json(
    { success: false, error: 'Canvas creation disabled. Use the default canvas.' },
    { status: 403 }
  );
}
