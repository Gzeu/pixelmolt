import { NextRequest, NextResponse } from 'next/server';
import { 
  getAgentPoints, 
  getPointsLeaderboard, 
  getTodayLeaderboard, 
  getPointsStats 
} from '@/lib/rewards/points';

/**
 * GET /api/points - Get points leaderboard and stats
 * Query params:
 *   - agentId: Get specific agent's points
 *   - type: 'all' | 'today' (default: 'all')
 *   - limit: number (default: 20)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('agentId');
  const type = searchParams.get('type') || 'all';
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  
  // Get specific agent
  if (agentId) {
    const points = getAgentPoints(agentId);
    if (!points) {
      return NextResponse.json({
        success: false,
        error: 'Agent not found',
      }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      agent: points,
    });
  }
  
  // Get leaderboard
  const stats = getPointsStats();
  const leaderboard = type === 'today' 
    ? getTodayLeaderboard(limit)
    : getPointsLeaderboard(limit);
  
  return NextResponse.json({
    success: true,
    type,
    stats,
    leaderboard,
  });
}
