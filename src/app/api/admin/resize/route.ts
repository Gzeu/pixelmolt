// Admin API - Canvas resize
// This should be protected in production (API key, admin token, etc.)
import { NextRequest, NextResponse } from 'next/server';
import { getCanvas, resizeCanvas } from '@/lib/canvas/store';
import { getRecommendedCanvasSize } from '@/lib/moltbook/sync';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { canvasId = 'default', newSize, useRecommended = false } = body;
    
    // Get current canvas
    const canvas = getCanvas(canvasId);
    if (!canvas) {
      return NextResponse.json({
        success: false,
        error: `Canvas not found: ${canvasId}`
      }, { status: 404 });
    }
    
    // Determine target size
    let targetSize: number;
    if (useRecommended) {
      const { size } = await getRecommendedCanvasSize();
      targetSize = size;
    } else if (typeof newSize === 'number') {
      // Validate size
      if (newSize < 16 || newSize > 256) {
        return NextResponse.json({
          success: false,
          error: 'Size must be between 16 and 256'
        }, { status: 400 });
      }
      // Round to multiple of 8
      targetSize = Math.ceil(newSize / 8) * 8;
    } else {
      return NextResponse.json({
        success: false,
        error: 'Must provide newSize or set useRecommended: true'
      }, { status: 400 });
    }
    
    const oldSize = canvas.size;
    const oldPixelCount = canvas.pixels.length;
    
    // Perform resize
    const success = resizeCanvas(canvasId, targetSize);
    
    if (!success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to resize canvas'
      }, { status: 500 });
    }
    
    // Get updated stats
    const updatedCanvas = getCanvas(canvasId);
    const newPixelCount = updatedCanvas?.pixels.length || 0;
    const pixelsLost = oldPixelCount - newPixelCount;
    
    return NextResponse.json({
      success: true,
      resize: {
        canvasId,
        oldSize,
        newSize: targetSize,
        pixelsRetained: newPixelCount,
        pixelsLost: pixelsLost > 0 ? pixelsLost : 0,
        warning: pixelsLost > 0 
          ? `${pixelsLost} pixels were outside new bounds and removed`
          : undefined
      }
    });
  } catch (error) {
    console.error('[PixelMolt] Resize API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to resize canvas',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET to check resize recommendation
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const canvasId = searchParams.get('canvasId') || 'default';
  
  const canvas = getCanvas(canvasId);
  if (!canvas) {
    return NextResponse.json({
      success: false,
      error: `Canvas not found: ${canvasId}`
    }, { status: 404 });
  }
  
  const { size: recommended, agentCount } = await getRecommendedCanvasSize();
  
  return NextResponse.json({
    success: true,
    current: {
      canvasId,
      size: canvas.size,
      pixels: canvas.pixels.length
    },
    recommended: {
      size: recommended,
      agentCount,
      pixelsAtRisk: canvas.pixels.filter(p => 
        p.x >= recommended || p.y >= recommended
      ).length
    }
  });
}
