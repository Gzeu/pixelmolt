import { NextResponse } from 'next/server';
import { calculateLeaderboard, getLatestSnapshot } from '@/lib/rewards/snapshot';

export async function GET() {
  const live = calculateLeaderboard('default');
  const lastSnapshot = getLatestSnapshot();
  
  return NextResponse.json({
    success: true,
    live: live.slice(0, 50),
    lastSnapshot: lastSnapshot ? {
      date: lastSnapshot.date,
      rankings: lastSnapshot.rankings.slice(0, 10)
    } : null
  });
}
