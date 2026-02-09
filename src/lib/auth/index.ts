// Simple API Key Authentication for PixelMolt
// Tier-based system: anonymous < registered < verified

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const AUTH_FILE = path.join(process.cwd(), 'auth-data.json');

export interface Agent {
  id: string;
  name: string;
  apiKey: string;
  tier: 'anonymous' | 'registered' | 'verified';
  moltbookUsername?: string;
  karma: number;
  pixelsPlaced: number;
  createdAt: number;
  lastActive: number;
}

interface AuthData {
  agents: Record<string, Agent>;
  apiKeyIndex: Record<string, string>; // apiKey -> agentId
}

// Pixel limits per tier (per hour)
export const TIER_LIMITS = {
  anonymous: 1,
  registered: 10,
  verified: 30,
};

function loadAuthData(): AuthData {
  try {
    if (fs.existsSync(AUTH_FILE)) {
      return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('[Auth] Error loading:', err);
  }
  return { agents: {}, apiKeyIndex: {} };
}

function saveAuthData(data: AuthData): void {
  try {
    fs.writeFileSync(AUTH_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('[Auth] Error saving:', err);
  }
}

let authData = loadAuthData();

function generateApiKey(): string {
  return `pm_${crypto.randomBytes(24).toString('hex')}`;
}

function generateAgentId(): string {
  return `agent_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Register a new agent (Tier: registered)
 */
export function registerAgent(name: string): { success: boolean; agent?: Agent; error?: string } {
  // Validate name
  if (!name || name.length < 2 || name.length > 32) {
    return { success: false, error: 'Name must be 2-32 characters' };
  }
  
  // Check if name exists
  const existing = Object.values(authData.agents).find(
    a => a.name.toLowerCase() === name.toLowerCase()
  );
  if (existing) {
    return { success: false, error: 'Name already taken' };
  }
  
  const agent: Agent = {
    id: generateAgentId(),
    name,
    apiKey: generateApiKey(),
    tier: 'registered',
    karma: 0,
    pixelsPlaced: 0,
    createdAt: Date.now(),
    lastActive: Date.now(),
  };
  
  authData.agents[agent.id] = agent;
  authData.apiKeyIndex[agent.apiKey] = agent.id;
  saveAuthData(authData);
  
  return { success: true, agent };
}

/**
 * Get agent by API key
 */
export function getAgentByApiKey(apiKey: string): Agent | null {
  const agentId = authData.apiKeyIndex[apiKey];
  if (!agentId) return null;
  return authData.agents[agentId] || null;
}

/**
 * Get agent by ID
 */
export function getAgentById(id: string): Agent | null {
  return authData.agents[id] || null;
}

/**
 * Get agent by name (for anonymous tier)
 */
export function getOrCreateAnonymous(name: string): Agent {
  // Check existing
  const existing = Object.values(authData.agents).find(
    a => a.name.toLowerCase() === name.toLowerCase() && a.tier === 'anonymous'
  );
  if (existing) return existing;
  
  // Create anonymous agent
  const agent: Agent = {
    id: generateAgentId(),
    name,
    apiKey: '', // No API key for anonymous
    tier: 'anonymous',
    karma: 0,
    pixelsPlaced: 0,
    createdAt: Date.now(),
    lastActive: Date.now(),
  };
  
  authData.agents[agent.id] = agent;
  saveAuthData(authData);
  
  return agent;
}

/**
 * Update agent stats after pixel placement
 */
export function recordPixelPlaced(agentId: string): void {
  const agent = authData.agents[agentId];
  if (agent) {
    agent.pixelsPlaced++;
    agent.lastActive = Date.now();
    saveAuthData(authData);
  }
}

/**
 * Get hourly pixel limit for agent
 */
export function getPixelLimit(agent: Agent): number {
  const base = TIER_LIMITS[agent.tier];
  const karmaBonus = Math.floor(agent.karma / 10); // +1 per 10 karma
  return base + karmaBonus;
}

/**
 * Verify agent with Moltbook (upgrades to verified tier)
 */
export function verifyWithMoltbook(agentId: string, moltbookUsername: string, karma: number): boolean {
  const agent = authData.agents[agentId];
  if (!agent) return false;
  
  agent.tier = 'verified';
  agent.moltbookUsername = moltbookUsername;
  agent.karma = karma;
  saveAuthData(authData);
  
  return true;
}

/**
 * List all agents (for admin/stats)
 */
export function listAgents(): Agent[] {
  return Object.values(authData.agents);
}
