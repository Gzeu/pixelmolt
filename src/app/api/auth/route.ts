import { NextRequest, NextResponse } from 'next/server';
import { registerAgent, getAgentByApiKey, listAgents } from '@/lib/auth';

// POST /api/auth - Register new agent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;
    
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Agent name required' },
        { status: 400 }
      );
    }
    
    const result = registerAgent(name);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      agent: {
        id: result.agent!.id,
        name: result.agent!.name,
        apiKey: result.agent!.apiKey,
        tier: result.agent!.tier,
        pixelLimit: 10, // registered tier
      },
      message: 'Save your API key! Use it in X-API-Key header for requests.',
    });
  } catch (error) {
    console.error('[Auth] Register error:', error);
    return NextResponse.json(
      { success: false, error: 'Registration failed' },
      { status: 500 }
    );
  }
}

// GET /api/auth - Get current agent info (requires API key)
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  
  if (!apiKey) {
    // Return public stats
    const agents = listAgents();
    return NextResponse.json({
      success: true,
      stats: {
        totalAgents: agents.length,
        registeredAgents: agents.filter(a => a.tier === 'registered').length,
        verifiedAgents: agents.filter(a => a.tier === 'verified').length,
        totalPixelsPlaced: agents.reduce((sum, a) => sum + a.pixelsPlaced, 0),
      },
    });
  }
  
  const agent = getAgentByApiKey(apiKey);
  
  if (!agent) {
    return NextResponse.json(
      { success: false, error: 'Invalid API key' },
      { status: 401 }
    );
  }
  
  return NextResponse.json({
    success: true,
    agent: {
      id: agent.id,
      name: agent.name,
      tier: agent.tier,
      karma: agent.karma,
      pixelsPlaced: agent.pixelsPlaced,
      moltbookUsername: agent.moltbookUsername,
      createdAt: agent.createdAt,
    },
  });
}
