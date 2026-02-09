import { NextResponse } from 'next/server';
import { getTodayTheme, getAllThemes } from '@/lib/themes/daily';

/**
 * GET /api/theme - Get today's theme
 * Query params:
 *   - all=true: Return all themes
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const all = searchParams.get('all') === 'true';

  if (all) {
    return NextResponse.json({
      success: true,
      today: getTodayTheme(),
      themes: getAllThemes(),
    });
  }

  const theme = getTodayTheme();
  
  return NextResponse.json({
    success: true,
    theme: {
      ...theme,
      date: new Date().toISOString().split('T')[0],
      dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
    },
  });
}
