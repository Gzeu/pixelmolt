import { NextResponse } from 'next/server';
import { createDailySnapshot } from '@/lib/rewards/snapshot';

export async function POST() {
  const snapshot = createDailySnapshot();
  return NextResponse.json({ success: true, snapshot });
}
