// Battle State Management for PixelMolt PvP
import { Pixel } from '@/types';

export type TeamColor = 'red' | 'blue';

export interface BattleParticipant {
  agentId: string;
  team: TeamColor;
  pixelsPlaced: number;
  lastPixelTime: number;
}

export interface BattlePixel extends Pixel {
  team: TeamColor;
}

export interface BattleState {
  id: string;
  canvasSize: number;
  duration: number; // total duration in seconds
  startTime: number;
  endTime: number;
  status: 'waiting' | 'active' | 'ended';
  participants: Map<string, BattleParticipant>;
  pixels: Map<string, BattlePixel>; // key: "x,y"
  scores: { red: number; blue: number };
  winner: TeamColor | 'draw' | null;
}

// Team colors
export const TEAM_COLORS: Record<TeamColor, string> = {
  red: '#EF4444',
  blue: '#3B82F6',
};

// Base cooldown in milliseconds
const BASE_COOLDOWN = 1000;
const OVERWRITE_MULTIPLIER = 2;

// In-memory battle storage
const battles = new Map<string, BattleState>();

// Generate unique battle ID
function generateBattleId(): string {
  return `battle_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Create a new battle
export function createBattle(canvasSize: number, duration: number): BattleState {
  const id = generateBattleId();
  const now = Date.now();
  
  const battle: BattleState = {
    id,
    canvasSize,
    duration,
    startTime: now,
    endTime: now + (duration * 1000),
    status: 'active',
    participants: new Map(),
    pixels: new Map(),
    scores: { red: 0, blue: 0 },
    winner: null,
  };
  
  battles.set(id, battle);
  return battle;
}

// Join a battle
export function joinBattle(
  battleId: string,
  agentId: string,
  team: TeamColor
): { success: boolean; error?: string; participant?: BattleParticipant } {
  const battle = battles.get(battleId);
  
  if (!battle) {
    return { success: false, error: 'Battle not found' };
  }
  
  if (battle.status === 'ended') {
    return { success: false, error: 'Battle has ended' };
  }
  
  // Check if already in battle
  if (battle.participants.has(agentId)) {
    const existing = battle.participants.get(agentId)!;
    return { success: true, participant: existing };
  }
  
  const participant: BattleParticipant = {
    agentId,
    team,
    pixelsPlaced: 0,
    lastPixelTime: 0,
  };
  
  battle.participants.set(agentId, participant);
  return { success: true, participant };
}

// Place a pixel in battle
export function placePixel(
  battleId: string,
  agentId: string,
  x: number,
  y: number
): { success: boolean; error?: string; pixel?: BattlePixel; cooldown?: number } {
  const battle = battles.get(battleId);
  
  if (!battle) {
    return { success: false, error: 'Battle not found' };
  }
  
  // Check if battle is still active
  const now = Date.now();
  if (now >= battle.endTime || battle.status === 'ended') {
    if (battle.status !== 'ended') {
      endBattle(battleId);
    }
    return { success: false, error: 'Battle has ended' };
  }
  
  // Get participant
  const participant = battle.participants.get(agentId);
  if (!participant) {
    return { success: false, error: 'Not in battle. Join first!' };
  }
  
  // Validate coordinates
  if (x < 0 || x >= battle.canvasSize || y < 0 || y >= battle.canvasSize) {
    return { success: false, error: 'Coordinates out of bounds' };
  }
  
  // Check cooldown
  const pixelKey = `${x},${y}`;
  const existingPixel = battle.pixels.get(pixelKey);
  const isOverwrite = existingPixel && existingPixel.team !== participant.team;
  const cooldownRequired = isOverwrite ? BASE_COOLDOWN * OVERWRITE_MULTIPLIER : BASE_COOLDOWN;
  const timeSinceLastPixel = now - participant.lastPixelTime;
  
  if (timeSinceLastPixel < cooldownRequired) {
    const remainingCooldown = cooldownRequired - timeSinceLastPixel;
    return { 
      success: false, 
      error: `Cooldown active. Wait ${Math.ceil(remainingCooldown / 1000)}s`,
      cooldown: remainingCooldown 
    };
  }
  
  // Update scores if overwriting
  if (existingPixel) {
    battle.scores[existingPixel.team]--;
  }
  
  // Create new pixel
  const pixel: BattlePixel = {
    x,
    y,
    color: TEAM_COLORS[participant.team],
    agentId,
    timestamp: now,
    team: participant.team,
  };
  
  // Update state
  battle.pixels.set(pixelKey, pixel);
  battle.scores[participant.team]++;
  participant.pixelsPlaced++;
  participant.lastPixelTime = now;
  
  return { 
    success: true, 
    pixel, 
    cooldown: BASE_COOLDOWN 
  };
}

// Get battle scores
export function getScores(battleId: string): { red: number; blue: number } | null {
  const battle = battles.get(battleId);
  if (!battle) return null;
  return { ...battle.scores };
}

// End battle and determine winner
export function endBattle(battleId: string): { winner: TeamColor | 'draw'; scores: { red: number; blue: number } } | null {
  const battle = battles.get(battleId);
  if (!battle) return null;
  
  battle.status = 'ended';
  
  if (battle.scores.red > battle.scores.blue) {
    battle.winner = 'red';
  } else if (battle.scores.blue > battle.scores.red) {
    battle.winner = 'blue';
  } else {
    battle.winner = 'draw';
  }
  
  return {
    winner: battle.winner,
    scores: { ...battle.scores },
  };
}

// Get battle state
export function getBattle(battleId: string): BattleState | null {
  return battles.get(battleId) || null;
}

// Get all active battles
export function getActiveBattles(): BattleState[] {
  const now = Date.now();
  const active: BattleState[] = [];
  
  battles.forEach((battle) => {
    // Auto-end expired battles
    if (battle.status === 'active' && now >= battle.endTime) {
      endBattle(battle.id);
    }
    
    if (battle.status === 'active') {
      active.push(battle);
    }
  });
  
  return active;
}

// Get battle for serialization (convert Maps to objects)
export function serializeBattle(battle: BattleState) {
  const now = Date.now();
  const timeRemaining = Math.max(0, Math.floor((battle.endTime - now) / 1000));
  
  return {
    id: battle.id,
    canvasSize: battle.canvasSize,
    duration: battle.duration,
    timeRemaining,
    status: battle.status,
    participants: Array.from(battle.participants.values()),
    pixels: Array.from(battle.pixels.values()),
    scores: battle.scores,
    winner: battle.winner,
    teams: {
      red: {
        color: TEAM_COLORS.red,
        members: Array.from(battle.participants.values())
          .filter(p => p.team === 'red')
          .map(p => p.agentId),
      },
      blue: {
        color: TEAM_COLORS.blue,
        members: Array.from(battle.participants.values())
          .filter(p => p.team === 'blue')
          .map(p => p.agentId),
      },
    },
  };
}
