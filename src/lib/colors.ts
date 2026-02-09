// PixelMolt Color Palette - Game-like preset colors

export const PIXEL_PALETTE = [
  // Primary Row
  '#FF0000', '#FF8800', '#FFFF00', '#00FF00',
  '#00FFFF', '#0088FF', '#0000FF', '#8800FF',
  // Secondary Row
  '#FF00FF', '#FFFFFF', '#888888', '#000000',
  // Extended palette
  '#FF4444', '#FFAA44', '#FFFF88', '#88FF88',
  '#88FFFF', '#4488FF', '#4444FF', '#AA44FF',
  '#FF88FF', '#CCCCCC', '#444444', '#220000',
] as const;

export const PALETTE_CATEGORIES = {
  hot: ['#FF0000', '#FF4444', '#FF8800', '#FFAA44', '#FFFF00', '#FFFF88'],
  cold: ['#00FFFF', '#88FFFF', '#0088FF', '#4488FF', '#0000FF', '#4444FF'],
  nature: ['#00FF00', '#88FF88', '#008800', '#884400', '#FFFF00', '#00FFFF'],
  cosmic: ['#8800FF', '#AA44FF', '#FF00FF', '#FF88FF', '#0000FF', '#000044'],
  grayscale: ['#FFFFFF', '#CCCCCC', '#888888', '#444444', '#220000', '#000000'],
} as const;

export type PaletteCategory = keyof typeof PALETTE_CATEGORIES;

// Get a random color from the palette
export function getRandomPaletteColor(): string {
  return PIXEL_PALETTE[Math.floor(Math.random() * PIXEL_PALETTE.length)];
}

// Get complementary color
export function getComplementary(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  const compR = (255 - r).toString(16).padStart(2, '0');
  const compG = (255 - g).toString(16).padStart(2, '0');
  const compB = (255 - b).toString(16).padStart(2, '0');
  
  return `#${compR}${compG}${compB}`.toUpperCase();
}

// Lighten/darken a color
export function adjustBrightness(hex: string, percent: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  const adjust = (value: number) => {
    const adjusted = Math.round(value * (1 + percent / 100));
    return Math.max(0, Math.min(255, adjusted)).toString(16).padStart(2, '0');
  };
  
  return `#${adjust(r)}${adjust(g)}${adjust(b)}`.toUpperCase();
}
