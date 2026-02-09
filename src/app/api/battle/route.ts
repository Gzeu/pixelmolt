import { NextRequest, NextResponse } from 'next/server';
import { createBattle, getActiveBattles, serializeBattle } from '@/lib/battle/manager';

// GET: List active battles
export async function GET() {
  try {
    const battles = getActiveBattles();
    const serialized = battles.map(serializeBattle);
    
    return NextResponse.json({
      success: true,
      battles: serialized,
      count: serialized.length,
    });
  } catch (error) {
    console.error('Error fetching battles:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch battles' },
      { status: 500 }
    );
  }
}

// POST: Create new battle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { size = 32, duration = 300 } = body;
    
    // Validate inputs
    if (size < 8 || size > 128) {
      return NextResponse.json(
        { success: false, error: 'Size must be between 8 and 128' },
        { status: 400 }
      );
    }
    
    if (duration < 60 || duration > 3600) {
      return NextResponse.json(
        { success: false, error: 'Duration must be between 60 and 3600 seconds' },
        { status: 400 }
      );
    }
    
    const battle = createBattle(size, duration);
    
    return NextResponse.json({
      success: true,
      battle: serializeBattle(battle),
    });
  } catch (error) {
    console.error('Error creating battle:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create battle' },
      { status: 500 }
    );
  }
}
