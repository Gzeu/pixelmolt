import { NextRequest, NextResponse } from 'next/server';
import { placePixel, getCanvasAsync, isValidHexColor, checkRateLimit, isUsingRedis } from '@/lib/canvas/store';
import * as storage from '@/lib/storage/provider';

interface PlacePixelRequest {
  canvasId: string;
  x: number;
  y: number;
  color: string;
  agentId?: string;
  debugBypass?: boolean; // Temporary for testing
}

/**
 * GET /api/pixel - Get storage info
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    storage: isUsingRedis() ? 'redis' : 'json',
    message: 'Use POST to place a pixel',
  });
}

/**
 * POST /api/pixel - Place a pixel on the canvas
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as PlacePixelRequest;
    const { canvasId, x, y, color, agentId, debugBypass } = body;
    
    console.log(`[Pixel API] Received request: canvasId=${canvasId}, x=${x}, y=${y}, color=${color}, agentId=${agentId}`);

    // Validate required fields
    if (!canvasId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: canvasId' },
        { status: 400 }
      );
    }

    if (typeof x !== 'number' || typeof y !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid coordinates: x and y must be numbers' },
        { status: 400 }
      );
    }

    if (!color) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: color' },
        { status: 400 }
      );
    }

    // Use agentId from body or generate anonymous ID from IP
    const effectiveAgentId = agentId || 
      request.headers.get('x-forwarded-for') || 
      request.headers.get('x-real-ip') || 
      'anonymous';

    // Pre-validate color format for better error message
    if (!isValidHexColor(color)) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Invalid hex color format: "${color}". Expected #RGB, #RRGGBB, or RRGGBB.` 
        },
        { status: 400 }
      );
    }

    // Skip rate limit check if debugBypass is true (TEMPORARY)
    if (!debugBypass) {
      const rateCheck = await checkRateLimit(effectiveAgentId);
      if (!rateCheck.allowed) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Rate limited. Please wait ${Math.ceil(rateCheck.waitMs / 1000)} seconds before placing another pixel.`,
            retryAfter: Math.ceil(rateCheck.waitMs / 1000)
          },
          { status: 429 }
        );
      }
    }

    // Check canvas exists
    console.log(`[Pixel API] Getting canvas: ${canvasId}`);
    const canvas = await getCanvasAsync(canvasId);
    if (!canvas) {
      console.log(`[Pixel API] Canvas not found!`);
      return NextResponse.json(
        { success: false, error: `Canvas not found: ${canvasId}` },
        { status: 404 }
      );
    }
    console.log(`[Pixel API] Canvas found with ${canvas.pixels.length} existing pixels`);

    // Place the pixel (now async)
    console.log(`[Pixel API] Placing pixel...`);
    const result = await placePixel({
      canvasId,
      x: Math.floor(x),
      y: Math.floor(y),
      color,
      agentId: effectiveAgentId,
    });

    if (!result.success) {
      console.log(`[Pixel API] placePixel failed: ${result.error}`);
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    console.log(`[Pixel API] Pixel placed successfully! Canvas now has ${result.canvas?.filled} pixels`);
    
    // Verify it was actually saved to Redis
    const verifyCanvas = await storage.getCanvas();
    console.log(`[Pixel API] Verification - Redis has ${verifyCanvas?.pixels.length} pixels`);

    return NextResponse.json({
      success: true,
      pixel: result.pixel,
      canvas: result.canvas,
      storage: isUsingRedis() ? 'redis' : 'json',
      debug: {
        verifiedPixelCount: verifyCanvas?.pixels.length
      }
    });

  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    console.error('[Pixel API] Error placing pixel:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}
