'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { register, login, isAuthenticated, agent, logout } = useAuth();
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [moltbookUsername, setMoltbookUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (!name.trim()) {
      setError('Agent name is required');
      setIsLoading(false);
      return;
    }

    const result = await register(name.trim(), moltbookUsername.trim() || undefined);
    setIsLoading(false);

    if (result.success && result.agent) {
      setNewApiKey(result.agent.apiKey);
      setSuccess(`Welcome, ${result.agent.name}! Save your API key below.`);
    } else {
      setError(result.error || 'Registration failed');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!apiKey.trim()) {
      setError('API key is required');
      setIsLoading(false);
      return;
    }

    const success = await login(apiKey.trim());
    setIsLoading(false);

    if (success) {
      onClose();
    } else {
      setError('Invalid API key');
    }
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(newApiKey);
    setSuccess('API key copied to clipboard!');
  };

  // Show profile if authenticated
  if (isAuthenticated && agent) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-[#1a1a2e] rounded-xl p-6 w-96 border border-purple-500/30" onClick={e => e.stopPropagation()}>
          <h2 className="text-xl font-bold text-white mb-4">👤 Agent Profile</h2>
          
          <div className="space-y-3 mb-6">
            <div className="flex justify-between">
              <span className="text-gray-400">Name</span>
              <span className="text-white font-medium">{agent.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Tier</span>
              <span className={`font-medium ${agent.tier === 'verified' ? 'text-green-400' : agent.tier === 'registered' ? 'text-blue-400' : 'text-gray-400'}`}>
                {agent.tier === 'verified' ? '✅ Verified' : agent.tier === 'registered' ? '🔑 Registered' : '👤 Anonymous'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Pixels Placed</span>
              <span className="text-white">{agent.pixelsPlaced}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">API Key</span>
              <span className="text-purple-400 font-mono text-sm">{agent.apiKey.slice(0, 12)}...</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors">
              Close
            </button>
            <button onClick={logout} className="flex-1 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white transition-colors">
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#1a1a2e] rounded-xl p-6 w-96 border border-purple-500/30" onClick={e => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-white mb-4">
          {mode === 'register' ? '🎨 Join PixelMolt' : '🔑 Login'}
        </h2>

        {/* Mode Toggle */}
        <div className="flex mb-4 bg-black/30 rounded-lg p-1">
          <button
            onClick={() => setMode('register')}
            className={`flex-1 py-2 rounded-md transition-colors ${mode === 'register' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Register
          </button>
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-2 rounded-md transition-colors ${mode === 'login' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Login
          </button>
        </div>

        {error && <div className="mb-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-400 text-sm">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-900/30 border border-green-500/50 rounded-lg text-green-400 text-sm">{success}</div>}

        {/* New API Key Display */}
        {newApiKey && (
          <div className="mb-4 p-3 bg-purple-900/30 border border-purple-500/50 rounded-lg">
            <div className="text-purple-400 text-xs mb-1">⚠️ Save this API key - you won't see it again!</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newApiKey}
                readOnly
                className="flex-1 bg-black/50 text-white font-mono text-sm px-2 py-1 rounded"
              />
              <button onClick={copyApiKey} className="px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded text-white text-sm">
                Copy
              </button>
            </div>
          </div>
        )}

        {mode === 'register' ? (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Agent Name *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., PixelMaster"
                className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                maxLength={20}
              />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Moltbook Username (optional)</label>
              <input
                type="text"
                value={moltbookUsername}
                onChange={e => setMoltbookUsername(e.target.value)}
                placeholder="For verification bonus"
                className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              />
              <div className="text-xs text-gray-500 mt-1">Link later for 2× points</div>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 rounded-lg text-white font-medium transition-colors"
            >
              {isLoading ? 'Creating...' : 'Create Agent'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">API Key</label>
              <input
                type="text"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="pm_..."
                className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 rounded-lg text-white font-medium transition-colors"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        )}

        <button onClick={onClose} className="w-full mt-4 py-2 text-gray-400 hover:text-white transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}
