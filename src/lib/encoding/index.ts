// Text to Visual Encoding - Synesthetic Mapping
import { Thought, EncodedThought, HSLColor, ShapeType } from '@/types';

// Semantic word categories for color mapping
const WORD_CATEGORIES: Record<string, { hue: number; intensity: number }> = {
  // Emotions
  'love': { hue: 350, intensity: 0.9 },
  'hate': { hue: 0, intensity: 0.95 },
  'joy': { hue: 50, intensity: 0.85 },
  'fear': { hue: 270, intensity: 0.8 },
  'peace': { hue: 180, intensity: 0.6 },
  'chaos': { hue: 30, intensity: 1.0 },
  'calm': { hue: 200, intensity: 0.4 },
  
  // Abstract concepts
  'void': { hue: 260, intensity: 0.9 },
  'light': { hue: 60, intensity: 0.95 },
  'dark': { hue: 240, intensity: 0.7 },
  'infinite': { hue: 280, intensity: 0.85 },
  'fractal': { hue: 300, intensity: 0.9 },
  'spiral': { hue: 180, intensity: 0.75 },
  
  // Space/cosmic
  'galaxy': { hue: 220, intensity: 0.9 },
  'star': { hue: 45, intensity: 0.95 },
  'nebula': { hue: 290, intensity: 0.85 },
  'cosmic': { hue: 260, intensity: 0.8 },
  'universe': { hue: 230, intensity: 0.9 },
  
  // Nature
  'fire': { hue: 15, intensity: 0.95 },
  'water': { hue: 200, intensity: 0.7 },
  'earth': { hue: 35, intensity: 0.6 },
  'wind': { hue: 170, intensity: 0.5 },
  'crystal': { hue: 185, intensity: 0.8 },
  
  // Tech/digital
  'code': { hue: 120, intensity: 0.7 },
  'data': { hue: 180, intensity: 0.65 },
  'neural': { hue: 280, intensity: 0.8 },
  'quantum': { hue: 310, intensity: 0.9 },
  'electric': { hue: 55, intensity: 0.95 },
};

// Shape mapping based on word patterns
const SHAPE_PATTERNS: Record<string, ShapeType> = {
  'spiral': 'spiral',
  'spin': 'spiral',
  'swirl': 'spiral',
  'rotate': 'spiral',
  'star': 'star',
  'shine': 'star',
  'glow': 'star',
  'burst': 'star',
  'fractal': 'fractal',
  'infinite': 'fractal',
  'recursive': 'fractal',
  'pattern': 'fractal',
  'line': 'line',
  'stream': 'line',
  'flow': 'line',
  'ray': 'line',
};

// Hash function for consistent word → hue mapping
function hashWord(word: string): number {
  let hash = 0;
  for (let i = 0; i < word.length; i++) {
    const char = word.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) % 360;
}

// Tokenize and clean text
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2);
}

// Calculate sentiment/intensity from text
function calculateIntensity(tokens: string[]): number {
  const intensityWords = ['very', 'extremely', 'intense', 'massive', 'huge', 'infinite', 'endless'];
  const calmWords = ['gentle', 'soft', 'quiet', 'calm', 'peaceful', 'subtle'];
  
  let intensity = 0.5; // baseline
  
  tokens.forEach(token => {
    if (intensityWords.includes(token)) intensity += 0.15;
    if (calmWords.includes(token)) intensity -= 0.1;
    if (WORD_CATEGORIES[token]) {
      intensity = Math.max(intensity, WORD_CATEGORIES[token].intensity);
    }
  });
  
  return Math.max(0.2, Math.min(1.0, intensity));
}

// Calculate chaos level (affects particle behavior)
function calculateChaos(tokens: string[]): number {
  const chaosWords = ['chaos', 'random', 'wild', 'explosion', 'burst', 'scatter', 'storm'];
  const orderWords = ['order', 'calm', 'structured', 'aligned', 'organized', 'peaceful'];
  
  let chaos = 0.3;
  
  tokens.forEach(token => {
    if (chaosWords.includes(token)) chaos += 0.2;
    if (orderWords.includes(token)) chaos -= 0.1;
  });
  
  return Math.max(0.1, Math.min(1.0, chaos));
}

// Extract colors from tokens
function extractColors(tokens: string[], baseIntensity: number): HSLColor[] {
  const colors: HSLColor[] = [];
  
  tokens.forEach(token => {
    let hue: number;
    let saturation = 70 + (baseIntensity * 30);
    let lightness = 40 + (baseIntensity * 30);
    
    if (WORD_CATEGORIES[token]) {
      hue = WORD_CATEGORIES[token].hue;
      saturation = 60 + (WORD_CATEGORIES[token].intensity * 40);
    } else {
      hue = hashWord(token);
    }
    
    colors.push({
      h: hue,
      s: saturation,
      l: lightness,
      a: 0.8 + (baseIntensity * 0.2),
    });
  });
  
  // Always return at least one color
  if (colors.length === 0) {
    colors.push({ h: 200, s: 70, l: 50, a: 0.9 });
  }
  
  return colors;
}

// Extract shapes from tokens
function extractShapes(tokens: string[]): ShapeType[] {
  const shapes: ShapeType[] = [];
  
  tokens.forEach(token => {
    if (SHAPE_PATTERNS[token]) {
      shapes.push(SHAPE_PATTERNS[token]);
    }
  });
  
  // Default shape
  if (shapes.length === 0) {
    shapes.push('circle');
  }
  
  return shapes;
}

// Main encoding function
export function encodeThought(thought: Thought): EncodedThought {
  const tokens = tokenize(thought.text);
  const intensity = calculateIntensity(tokens);
  const chaos = calculateChaos(tokens);
  const colors = extractColors(tokens, intensity);
  const shapes = extractShapes(tokens);
  
  // Karma multiplier (if available)
  const karmaMultiplier = thought.karma ? 1 + (thought.karma / 100) : 1;
  
  // Calculate particle count based on text length and intensity
  const baseParticleCount = Math.min(tokens.length * 20, 200);
  const particleCount = Math.floor(baseParticleCount * intensity * karmaMultiplier);
  
  // Speed based on chaos and intensity
  const speed = 0.5 + (chaos * 0.5) + (intensity * 0.3);
  
  return {
    thought,
    colors,
    intensity: intensity * karmaMultiplier,
    chaos,
    speed,
    particleCount,
    shapes,
  };
}

// Helper to convert HSL to CSS string
export function hslToString(color: HSLColor): string {
  return `hsla(${color.h}, ${color.s}%, ${color.l}%, ${color.a})`;
}

// Helper to blend two colors
export function blendColors(c1: HSLColor, c2: HSLColor, ratio: number = 0.5): HSLColor {
  return {
    h: (c1.h * (1 - ratio) + c2.h * ratio) % 360,
    s: c1.s * (1 - ratio) + c2.s * ratio,
    l: c1.l * (1 - ratio) + c2.l * ratio,
    a: c1.a * (1 - ratio) + c2.a * ratio,
  };
}
