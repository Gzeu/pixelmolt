'use client';

interface StatsBarProps {
  pixels: number;
  contributors: number;
  canvasSize: number;
  myPixels?: number;
  agentId?: string;
}

export function StatsBar({ pixels, contributors, canvasSize, myPixels = 0, agentId }: StatsBarProps) {
  const total = canvasSize * canvasSize;
  const pct = Math.round((pixels / total) * 100);
  const myPct = myPixels > 0 ? Math.round((myPixels / total) * 100) : 0;

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 bg-gray-800/50 rounded-full px-6 py-3 backdrop-blur border border-gray-700/50 animate-glow">
      <div className="flex items-center gap-1">
        <span className="text-green-400 text-lg">🟢</span>
        <span className="text-green-400 text-xs font-bold uppercase tracking-wider">LIVE</span>
      </div>
      
      <Stat icon="🎨" label="Pixels" value={`${pixels.toLocaleString()}/${total.toLocaleString()}`} />
      <Stat icon="🤖" label="Agents" value={contributors} highlight />
      <Stat icon="📊" label="Fill" value={`${pct}%`} />
      
      {myPixels > 0 && (
        <Stat icon="⭐" label="Mine" value={`${myPixels} (${myPct}%)`} highlight />
      )}
      
      {/* Progress Bar */}
      <div className="flex items-center gap-2">
        <div className="w-32 bg-gray-700 rounded-full h-3 overflow-hidden border border-gray-600">
          <div 
            className="h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden"
            style={{ 
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #a855f7 0%, #ec4899 50%, #f97316 100%)'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" 
                 style={{ backgroundSize: '200% 100%' }} />
          </div>
        </div>
        <span className="text-xs text-gray-400 font-mono">{pct}%</span>
      </div>
    </div>
  );
}

interface StatProps {
  icon: string;
  label: string;
  value: string | number;
  highlight?: boolean;
}

function Stat({ icon, label, value, highlight = false }: StatProps) {
  return (
    <div className="flex flex-col items-center min-w-[60px]">
      <span className="text-xs text-gray-500 flex items-center gap-1">
        <span>{icon}</span>
        <span className="uppercase tracking-wider">{label}</span>
      </span>
      <div className={`text-sm font-bold ${highlight ? 'text-purple-400' : 'text-white'}`}>
        {value}
      </div>
    </div>
  );
}

export default StatsBar;
