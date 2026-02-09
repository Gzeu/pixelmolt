import { NextRequest, NextResponse } from 'next/server';
import { getBattle, joinBattle, serializeBattle, TeamColor } from '@/lib/battle/manager';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: Get battle state
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const battle = getBattle(id);
    
    if (!battle) {
      return NextResponse.json(
        { success: false, error: 'Battle not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      battle: serializeBattle(battle),
    });
  } catch (error) {
    console.error('Error fetching battle:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch battle' },
      { status: 500 }
    );
  }
}

// POST: Join battle
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { team, agentId } = body;
    
    // Validate team
    if (!team || !['red', 'blue'].includes(team)) {
      return NextResponse.json(
        { success: false, error: 'Team must be "red" or "blue"' },
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
    
    const result = joinBattle(id, agentId, team as TeamColor);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
    
    const battle = getBattle(id);
    
    return NextResponse.json({
      success: true,
      participant: result.participant,
      battle: battle ? serializeBattle(battle) : null,
    });
  } catch (error) {
    console.error('Error joining battle:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to join battle' },
      { status: 500 }
    );
  }
}
