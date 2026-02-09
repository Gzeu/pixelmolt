// Stats API - Moltbook sync and canvas statistics
import { NextResponse } from 'next/server';
import { getRecommendedCanvasSize, shouldResizeCanvas } from '@/lib/moltbook/sync';
import { getCanvas, getCanvasStats } from '@/lib/canvas/store';

export async function GET() {
  try {
    const { size: recommended, agentCount, fromCache } = await getRecommendedCanvasSize();
    const canvas = getCanvas('default');
    const stats = canvas ? getCanvasStats('default') : null;
    
    const currentSize = canvas?.size || 64;
    const resizeInfo = await shouldResizeCanvas(currentSize);
    
    return NextResponse.json({
      success: true,
      moltbook: {
        agentCount,
        recommendedSize: recommended,
        fromCache,
        lastSync: fromCache ? 'cached' : 'fresh'
      },
      canvas: {
        id: canvas?.id || 'default',
        currentSize,
        pixelCount: stats?.filled || 0,
        totalCells: stats?.total || currentSize * currentSize,
        fillPercentage: stats?.percentage || 0,
        contributors: canvas?.contributors.length || 0,
        status: canvas?.status || 'unknown'
      },
      resize: {
        recommended: resizeInfo.shouldResize,
        targetSize: resizeInfo.recommended,
        difference: resizeInfo.difference,
        reason: resizeInfo.shouldResize 
          ? (resizeInfo.difference > 0 
              ? `Canvas should grow: ${agentCount} agents need ${recommended}x${recommended} grid`
              : `Canvas could shrink: ${agentCount} agents only need ${recommended}x${recommended} grid`)
          : 'Canvas size is optimal'
      }
    });
  } catch (error) {
    console.error('[PixelMolt] Stats API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
