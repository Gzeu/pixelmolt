import { NextRequest, NextResponse } from 'next/server';
import { getCanvasAsync, getCanvasStatsAsync } from '@/lib/canvas/store';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * GET /api/canvas/[id] - Get canvas state with all pixels
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Canvas ID is required' },
        { status: 400 }
      );
    }

    const canvas = await getCanvasAsync(id);

    if (!canvas) {
      return NextResponse.json(
        { success: false, error: `Canvas not found: ${id}` },
        { status: 404 }
      );
    }

    const stats = await getCanvasStatsAsync(id);

    return NextResponse.json({
      success: true,
      canvas: {
        id: canvas.id,
        size: canvas.size,
        mode: canvas.mode,
        theme: canvas.theme,
        status: canvas.status,
        pixels: canvas.pixels,
        contributors: canvas.contributors,
      },
      stats: stats || { filled: 0, total: canvas.size * canvas.size, percentage: 0 },
    });

  } catch (error) {
    console.error('Error getting canvas:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
