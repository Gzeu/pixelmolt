import * as fs from 'fs';
import * as path from 'path';

const POINTS_FILE = path.join(process.cwd(), 'points-data.json');

interface PointsEntry {
  agentId: string;
  totalPoints: number;
  pixelsPlaced: number;
  pixelsConquered: number;
  dailyPoints: Record<string, number>; // date -> points
  lastActivity: number;
}

interface PointsData {
  agents: Record<string, PointsEntry>;
  totalPointsAwarded: number;
  lastUpdated: number;
}

// Point values
const POINTS = {
  PLACE: 1,        // Place on empty pixel
  CONQUER: 5,      // Overwrite someone else's pixel
  DEFEND: 2,       // Reclaim your own pixel back
};

function loadPoints(): PointsData {
  try {
    if (fs.existsSync(POINTS_FILE)) {
      return JSON.parse(fs.readFileSync(POINTS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('[Points] Load error:', e);
  }
  return { agents: {}, totalPointsAwarded: 0, lastUpdated: Date.now() };
}

function savePoints(data: PointsData) {
  data.lastUpdated = Date.now();
  fs.writeFileSync(POINTS_FILE, JSON.stringify(data, null, 2));
}

export function awardPoints(
  agentId: string, 
  action: 'place' | 'conquer' | 'defend',
  previousOwner?: string
): { points: number; total: number } {
  const data = loadPoints();
  const today = new Date().toISOString().split('T')[0];
  
  // Initialize agent if new
  if (!data.agents[agentId]) {
    data.agents[agentId] = {
      agentId,
      totalPoints: 0,
      pixelsPlaced: 0,
      pixelsConquered: 0,
      dailyPoints: {},
      lastActivity: Date.now(),
    };
  }
  
  const agent = data.agents[agentId];
  let pointsAwarded = 0;
  
  switch (action) {
    case 'place':
      pointsAwarded = POINTS.PLACE;
      agent.pixelsPlaced++;
      break;
    case 'conquer':
      pointsAwarded = POINTS.CONQUER;
      agent.pixelsConquered++;
      break;
    case 'defend':
      pointsAwarded = POINTS.DEFEND;
      break;
  }
  
  agent.totalPoints += pointsAwarded;
  agent.dailyPoints[today] = (agent.dailyPoints[today] || 0) + pointsAwarded;
  agent.lastActivity = Date.now();
  data.totalPointsAwarded += pointsAwarded;
  
  savePoints(data);
  
  return { points: pointsAwarded, total: agent.totalPoints };
}

export function getAgentPoints(agentId: string): PointsEntry | null {
  const data = loadPoints();
  return data.agents[agentId] || null;
}

export function getPointsLeaderboard(limit: number = 20): PointsEntry[] {
  const data = loadPoints();
  return Object.values(data.agents)
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, limit);
}

export function getTodayLeaderboard(limit: number = 20): { agentId: string; points: number }[] {
  const data = loadPoints();
  const today = new Date().toISOString().split('T')[0];
  
  return Object.values(data.agents)
    .map(agent => ({
      agentId: agent.agentId,
      points: agent.dailyPoints[today] || 0,
    }))
    .filter(a => a.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, limit);
}

export function getPointsStats(): { totalAgents: number; totalPoints: number; todayPoints: number } {
  const data = loadPoints();
  const today = new Date().toISOString().split('T')[0];
  
  const todayPoints = Object.values(data.agents)
    .reduce((sum, agent) => sum + (agent.dailyPoints[today] || 0), 0);
  
  return {
    totalAgents: Object.keys(data.agents).length,
    totalPoints: data.totalPointsAwarded,
    todayPoints,
  };
}
