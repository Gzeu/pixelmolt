// Core types for the Consciousness Engine

// PixelMolt Canvas Types
export interface Pixel {
  x: number;
  y: number;
  color: string; // hex color
  agentId: string;
  timestamp: number;
  message?: string; // optional message (max 100 chars)
}

export interface Canvas {
  id: string;
  size: number; // NxN grid
  mode: 'freeform' | 'battle' | 'collaborative';
  theme: string;
  status: 'active' | 'paused' | 'completed';
  pixels: Pixel[];
  contributors: string[];
}

export interface Battle {
  id: string;
  canvasId: string;
  teams: Team[];
  scores: Record<string, number>;
  winner: string | null;
  timeRemaining: number; // seconds
}

export interface Team {
  id: string;
  name: string;
  color: string;
  members: string[];
}

export interface Agent {
  id: string;
  name: string;
  color: string; // signature color
  karma: number;
  pixelsPlaced: number;
}

// Consciousness Engine Types
export interface Thought {
  id: string;
  agentId: string;
  text: string;
  timestamp: number;
  karma?: number;
}

export interface EncodedThought {
  thought: Thought;
  colors: HSLColor[];
  intensity: number;
  chaos: number;
  speed: number;
  particleCount: number;
  shapes: ShapeType[];
}

export interface HSLColor {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
  a: number; // 0-1
}

export type ShapeType = 'circle' | 'star' | 'spiral' | 'fractal' | 'line';

export interface Particle {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: HSLColor;
  size: number;
  lifetime: number;
  maxLifetime: number;
  shape: ShapeType;
  trail: { x: number; y: number; z: number }[];
  glowIntensity: number;
  rotationSpeed: number;
}

export interface CanvasState {
  width: number;
  height: number;
  particles: Particle[];
  accumulationBuffer: ImageData | null;
  agentCount: number;
  totalThoughts: number;
}

export interface CrystallizedImage {
  data: string; // base64 PNG
  timestamp: number;
  thoughtCount: number;
  agentIds: string[];
  palette: HSLColor[];
}
