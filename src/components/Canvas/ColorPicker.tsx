'use client';

import { useState, useEffect } from 'react';
import { PIXEL_PALETTE, PALETTE_CATEGORIES, type PaletteCategory } from '@/lib/colors';

interface ColorPickerProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
}

const MAX_RECENT_COLORS = 8;

export default function ColorPicker({ selectedColor, onColorChange }: ColorPickerProps) {
  const [hexInput, setHexInput] = useState(selectedColor);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [signatureColor, setSignatureColor] = useState<string | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [activeCategory, setActiveCategory] = useState<PaletteCategory | 'all'>('all');

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('pixelmolt-recent-colors');
    if (saved) {
      setRecentColors(JSON.parse(saved));
    }
    const sig = localStorage.getItem('pixelmolt-signature-color');
    if (sig) {
      setSignatureColor(sig);
    }
  }, []);

  // Sync hex input with selected color
  useEffect(() => {
    setHexInput(selectedColor);
  }, [selectedColor]);

  const addToRecent = (color: string) => {
    const newRecent = [color, ...recentColors.filter(c => c !== color)].slice(0, MAX_RECENT_COLORS);
    setRecentColors(newRecent);
    localStorage.setItem('pixelmolt-recent-colors', JSON.stringify(newRecent));
  };

  const handlePresetClick = (color: string) => {
    onColorChange(color);
    addToRecent(color);
  };

  const handleHexSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const color = hexInput.startsWith('#') ? hexInput : `#${hexInput}`;
    if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
      onColorChange(color);
      addToRecent(color);
      setShowCustom(false);
    }
  };

  const handleSetSignature = () => {
    setSignatureColor(selectedColor);
    localStorage.setItem('pixelmolt-signature-color', selectedColor);
  };

  const handleUseSignature = () => {
    if (signatureColor) {
      onColorChange(signatureColor);
    }
  };

  const displayColors = activeCategory === 'all' 
    ? PIXEL_PALETTE 
    : PALETTE_CATEGORIES[activeCategory];

  const categoryEmojis: Record<PaletteCategory | 'all', string> = {
    all: '🎨',
    hot: '🔥',
    cold: '❄️',
    nature: '🌿',
    cosmic: '🌌',
    grayscale: '⬜',
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 space-y-4 backdrop-blur border border-gray-700/50">
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
        <span className="animate-float">🎨</span> Color Picker
      </h3>
      
      {/* Current Color Preview */}
      <div className="flex items-center gap-3">
        <div
          className="w-14 h-14 rounded-lg border-2 border-gray-600 shadow-lg animate-pulse-border relative overflow-hidden"
          style={{ backgroundColor: selectedColor }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
        </div>
        <div className="flex-1">
          <div className="text-white font-mono text-lg">{selectedColor}</div>
          <button 
            onClick={() => setShowCustom(!showCustom)}
            className="text-purple-400 text-xs hover:text-purple-300 transition-colors"
          >
            {showCustom ? '← Back to palette' : 'Custom color →'}
          </button>
        </div>
      </div>

      {/* Custom Color Input */}
      {showCustom && (
        <form onSubmit={handleHexSubmit} className="flex gap-2 animate-slide-in">
          <input
            type="text"
            value={hexInput}
            onChange={(e) => setHexInput(e.target.value.toUpperCase())}
            placeholder="#FFFFFF"
            maxLength={7}
            className="flex-1 bg-gray-700 text-white px-3 py-2 rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 border border-gray-600"
          />
          <input
            type="color"
            value={hexInput}
            onChange={(e) => {
              setHexInput(e.target.value.toUpperCase());
              onColorChange(e.target.value.toUpperCase());
            }}
            className="w-10 h-10 rounded cursor-pointer border-2 border-gray-600 bg-transparent"
          />
        </form>
      )}

      {/* Category Tabs */}
      {!showCustom && (
        <div className="flex flex-wrap gap-1">
          {(['all', ...Object.keys(PALETTE_CATEGORIES)] as (PaletteCategory | 'all')[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2 py-1 rounded text-xs transition-all ${
                activeCategory === cat 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              {categoryEmojis[cat]} {cat}
            </button>
          ))}
        </div>
      )}

      {/* Color Palette */}
      {!showCustom && (
        <div>
          <div className="grid grid-cols-6 gap-1.5">
            {displayColors.map((color) => (
              <button
                key={color}
                onClick={() => handlePresetClick(color)}
                className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 hover:z-10 relative group ${
                  selectedColor === color 
                    ? 'border-white ring-2 ring-purple-500 scale-110 z-10' 
                    : 'border-gray-600 hover:border-gray-400'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              >
                {selectedColor === color && (
                  <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold drop-shadow-lg">
                    ✓
                  </span>
                )}
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[9px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {color}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Colors */}
      {recentColors.length > 0 && (
        <div className="border-t border-gray-700 pt-3">
          <p className="text-gray-400 text-xs mb-2 flex items-center gap-1">
            <span>🕐</span> Recent
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {recentColors.map((color, i) => (
              <button
                key={`${color}-${i}`}
                onClick={() => handlePresetClick(color)}
                className={`w-6 h-6 rounded border-2 transition-transform hover:scale-110 ${
                  selectedColor === color ? 'border-white' : 'border-gray-600'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      )}

      {/* Signature Color */}
      <div className="border-t border-gray-700 pt-3">
        <p className="text-gray-400 text-xs mb-2 flex items-center gap-1">
          <span>⭐</span> My Signature
        </p>
        <div className="flex items-center gap-2">
          {signatureColor && (
            <button
              onClick={handleUseSignature}
              className="w-10 h-10 rounded-lg border-2 border-purple-500 hover:border-purple-400 transition-all hover:scale-105 animate-glow relative overflow-hidden"
              style={{ backgroundColor: signatureColor }}
              title={`Use signature: ${signatureColor}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
            </button>
          )}
          <button
            onClick={handleSetSignature}
            className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-xs py-2.5 px-3 rounded-lg transition-all hover:shadow-lg hover:shadow-purple-500/25"
          >
            {signatureColor ? '✨ Update Signature' : '⭐ Save as Signature'}
          </button>
        </div>
      </div>
    </div>
  );
}
