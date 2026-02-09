import { NextRequest, NextResponse } from 'next/server';
import { placePixel, getCanvasAsync, isValidHexColor, checkRateLimit, isUsingRedis } from '@/lib/canvas/store';

interface PlacePixelRequest {
  canvasId: string;
  x: number;
  y: number;
  color: string;
  agentId?: string;
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
    const { canvasId, x, y, color, agentId } = body;

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

    // Pre-check rate limit for better error handling
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

    // Check canvas exists
    const canvas = await getCanvasAsync(canvasId);
    if (!canvas) {
      return NextResponse.json(
        { success: false, error: `Canvas not found: ${canvasId}` },
        { status: 404 }
      );
    }

    // Place the pixel (now async)
    const result = await placePixel({
      canvasId,
      x: Math.floor(x),
      y: Math.floor(y),
      color,
      agentId: effectiveAgentId,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      pixel: result.pixel,
      canvas: result.canvas,
      storage: isUsingRedis() ? 'redis' : 'json',
    });

  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    console.error('Error placing pixel:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
