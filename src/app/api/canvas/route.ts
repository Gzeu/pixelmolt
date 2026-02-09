import { NextRequest, NextResponse } from 'next/server';
import { listCanvases, createCanvas } from '@/lib/canvas/store';
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
    const canvases = listCanvases();
    
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
 * POST /api/canvas - Create a new canvas
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CreateCanvasRequest;
    const { size, mode, theme } = body;

    // Validate size
    if (size !== undefined) {
      if (typeof size !== 'number' || size < 8 || size > 256) {
        return NextResponse.json(
          { success: false, error: 'Size must be a number between 8 and 256' },
          { status: 400 }
        );
      }
    }

    // Validate mode
    if (mode !== undefined) {
      const validModes = ['freeform', 'battle', 'collaborative'];
      if (!validModes.includes(mode)) {
        return NextResponse.json(
          { success: false, error: `Invalid mode. Must be one of: ${validModes.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Validate theme (just ensure it's a string if provided)
    if (theme !== undefined && typeof theme !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Theme must be a string' },
        { status: 400 }
      );
    }

    const canvas = createCanvas({ size, mode, theme });

    return NextResponse.json({
      success: true,
      canvas: {
        id: canvas.id,
        size: canvas.size,
        mode: canvas.mode,
        theme: canvas.theme,
        status: canvas.status,
        pixelCount: 0,
        contributorCount: 0,
        fillPercentage: 0,
      },
    }, { status: 201 });

  } catch (error) {
    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    console.error('Error creating canvas:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
