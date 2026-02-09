// Daily Theme System for PixelMolt

export interface DailyTheme {
  id: string;
  name: string;
  description: string;
  emoji: string;
  colors: string[];
  bonusMultiplier: number; // Points multiplier for theme colors
  featuredZone?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Weekly rotating themes
const WEEKLY_THEMES: Record<number, DailyTheme> = {
  0: { // Sunday
    id: 'sunset',
    name: 'Sunset Serenity',
    description: 'Paint the sky with warm sunset colors',
    emoji: '🌅',
    colors: ['#FF6B35', '#F7931E', '#FFD700', '#FF4500', '#DC143C', '#8B008B'],
    bonusMultiplier: 1.5,
  },
  1: { // Monday
    id: 'ocean',
    name: 'Ocean Blues',
    description: 'Deep sea vibes - blues, teals, and aquas',
    emoji: '🌊',
    colors: ['#0077BE', '#00CED1', '#20B2AA', '#4169E1', '#1E90FF', '#00BFFF'],
    bonusMultiplier: 1.5,
  },
  2: { // Tuesday
    id: 'fire-ice',
    name: 'Fire & Ice',
    description: 'Battle of elements - hot vs cold',
    emoji: '🔥❄️',
    colors: ['#FF0000', '#FF4500', '#FF6347', '#00BFFF', '#1E90FF', '#4169E1'],
    bonusMultiplier: 2.0, // Higher for competitive theme
  },
  3: { // Wednesday
    id: 'nature',
    name: 'Nature Walk',
    description: 'Forest greens and earthy tones',
    emoji: '🌿',
    colors: ['#228B22', '#32CD32', '#90EE90', '#8B4513', '#A0522D', '#F4A460'],
    bonusMultiplier: 1.5,
  },
  4: { // Thursday
    id: 'neon',
    name: 'Neon Night',
    description: 'Bright neons and cyberpunk vibes',
    emoji: '💜',
    colors: ['#FF00FF', '#00FF00', '#FF1493', '#00FFFF', '#FFD700', '#FF69B4'],
    bonusMultiplier: 1.5,
  },
  5: { // Friday
    id: 'gold-rush',
    name: 'Gold Rush',
    description: 'Precious metals - gold, silver, bronze',
    emoji: '🏆',
    colors: ['#FFD700', '#FFA500', '#DAA520', '#C0C0C0', '#CD7F32', '#B8860B'],
    bonusMultiplier: 1.5,
  },
  6: { // Saturday
    id: 'pixel-war',
    name: 'Pixel War',
    description: 'Free for all! Any color goes',
    emoji: '⚔️',
    colors: [], // No bonus colors - everything counts
    bonusMultiplier: 1.0, // No bonus on free day
  },
};

// Special event themes (override weekly)
const SPECIAL_THEMES: Record<string, DailyTheme> = {
  '02-14': { // Valentine's Day
    id: 'valentines',
    name: "Valentine's Day",
    description: 'Love is in the pixels - pinks and reds',
    emoji: '💕',
    colors: ['#FF1493', '#FF69B4', '#FFB6C1', '#DC143C', '#FF0000', '#C71585'],
    bonusMultiplier: 2.0,
  },
  '03-17': { // St Patrick's
    id: 'stpatricks',
    name: "St. Patrick's Day",
    description: 'Lucky greens everywhere!',
    emoji: '🍀',
    colors: ['#00FF00', '#228B22', '#32CD32', '#00FA9A', '#90EE90', '#008000'],
    bonusMultiplier: 2.0,
  },
  '10-31': { // Halloween
    id: 'halloween',
    name: 'Halloween',
    description: 'Spooky season - orange and black',
    emoji: '🎃',
    colors: ['#FF6600', '#FF8C00', '#000000', '#8B008B', '#4B0082', '#FFA500'],
    bonusMultiplier: 2.0,
  },
  '12-25': { // Christmas
    id: 'christmas',
    name: 'Christmas',
    description: 'Holiday cheer - red, green, and gold',
    emoji: '🎄',
    colors: ['#FF0000', '#00FF00', '#FFD700', '#FFFFFF', '#228B22', '#DC143C'],
    bonusMultiplier: 2.0,
  },
};

/**
 * Get today's theme
 */
export function getTodayTheme(): DailyTheme {
  const now = new Date();
  const monthDay = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  // Check for special event
  if (SPECIAL_THEMES[monthDay]) {
    return SPECIAL_THEMES[monthDay];
  }
  
  // Return weekly theme
  return WEEKLY_THEMES[now.getDay()];
}

/**
 * Check if a color matches today's theme
 */
export function isThemeColor(color: string): boolean {
  const theme = getTodayTheme();
  if (theme.colors.length === 0) return true; // Free day
  
  const normalizedColor = color.toUpperCase();
  return theme.colors.some(c => c.toUpperCase() === normalizedColor);
}

/**
 * Get points multiplier for a color
 */
export function getColorMultiplier(color: string): number {
  const theme = getTodayTheme();
  if (isThemeColor(color)) {
    return theme.bonusMultiplier;
  }
  return 1.0;
}

/**
 * Get all themes (for reference)
 */
export function getAllThemes(): { weekly: typeof WEEKLY_THEMES; special: typeof SPECIAL_THEMES } {
  return { weekly: WEEKLY_THEMES, special: SPECIAL_THEMES };
}
