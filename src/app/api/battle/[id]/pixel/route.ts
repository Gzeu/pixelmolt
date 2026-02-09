import { NextRequest, NextResponse } from 'next/server';
import { getBattle, placePixel, serializeBattle } from '@/lib/battle/manager';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST: Place a battle pixel
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { x, y, agentId } = body;
    
    // Validate coordinates
    if (typeof x !== 'number' || typeof y !== 'number') {
      return NextResponse.json(
        { success: false, error: 'x and y coordinates are required' },
        { status: 400 }
      );
    }
    
    // Validate agentId
    if (!agentId || typeof agentId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'agentId is required' },
        { status: 400 }
      );
    }
    
    const result = placePixel(id, agentId, x, y);
    
    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error,
          cooldown: result.cooldown,
        },
        { status: 400 }
      );
    }
    
    const battle = getBattle(id);
    
    return NextResponse.json({
      success: true,
      pixel: result.pixel,
      cooldown: result.cooldown,
      scores: battle?.scores,
    });
  } catch (error) {
    console.error('Error placing pixel:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to place pixel' },
      { status: 500 }
    );
  }
}
