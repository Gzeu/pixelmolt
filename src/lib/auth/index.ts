// API Key Authentication for PixelMolt
// Uses Redis in production, JSON file for local dev

import * as storage from '@/lib/storage/provider';

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

// Pixel limits per tier (per hour)
export const TIER_LIMITS = {
  anonymous: 1,
  registered: 10,
  verified: 30,
};

function generateApiKey(): string {
  // Use Web Crypto API for both server and edge
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `pm_${Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')}`;
}

function generateAgentId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return `agent_${Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Register a new agent (Tier: registered)
 */
export async function registerAgent(name: string): Promise<{ success: boolean; agent?: Agent; error?: string }> {
  // Validate name
  if (!name || name.length < 2 || name.length > 32) {
    return { success: false, error: 'Name must be 2-32 characters' };
  }
  
  // Check if name exists
  const allAgents = await storage.getAllAgents();
  const existing = allAgents.find(
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
  
  const saved = await storage.saveAgent(agent);
  if (!saved) {
    return { success: false, error: 'Failed to save agent' };
  }
  
  console.log(`[Auth] Registered agent: ${name} (${agent.id})`);
  return { success: true, agent };
}

/**
 * Get agent by API key
 */
export async function getAgentByApiKey(apiKey: string): Promise<Agent | null> {
  if (!apiKey) return null;
  return storage.getAgent(apiKey);
}

/**
 * Get agent by ID
 */
export async function getAgentById(id: string): Promise<Agent | null> {
  const allAgents = await storage.getAllAgents();
  return allAgents.find(a => a.id === id) || null;
}

/**
 * Get or create anonymous agent
 */
export async function getOrCreateAnonymous(name: string): Promise<Agent> {
  const allAgents = await storage.getAllAgents();
  
  // Check existing anonymous
  const existing = allAgents.find(
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
  
  await storage.saveAgent(agent);
  return agent;
}

/**
 * Update agent stats after pixel placement
 */
export async function recordPixelPlaced(agentId: string): Promise<void> {
  const agent = await getAgentById(agentId);
  if (agent) {
    agent.pixelsPlaced++;
    agent.lastActive = Date.now();
    await storage.saveAgent(agent);
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
export async function verifyWithMoltbook(agentId: string, moltbookUsername: string, karma: number): Promise<boolean> {
  const agent = await getAgentById(agentId);
  if (!agent) return false;
  
  agent.tier = 'verified';
  agent.moltbookUsername = moltbookUsername;
  agent.karma = karma;
  await storage.saveAgent(agent);
  
  return true;
}

/**
 * List all agents (for admin/stats)
 */
export async function listAgents(): Promise<Agent[]> {
  return storage.getAllAgents();
}
