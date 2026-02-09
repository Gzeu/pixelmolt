'use client';

import { useState, useEffect } from 'react';

interface ColorPickerProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
}

const PRESET_COLORS = [
  '#FF0000', '#FF6600', '#FFCC00', '#00FF00',
  '#00FFFF', '#0066FF', '#9900FF', '#FF00FF',
  '#FFFFFF', '#CCCCCC', '#666666', '#000000',
  '#8B4513', '#FFB6C1', '#90EE90', '#FFD700',
];

const MAX_RECENT_COLORS = 8;

export default function ColorPicker({ selectedColor, onColorChange }: ColorPickerProps) {
  const [hexInput, setHexInput] = useState(selectedColor);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [signatureColor, setSignatureColor] = useState<string | null>(null);

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

  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <h3 className="text-white font-semibold text-sm">Color Picker</h3>
      
      {/* Current Color Preview */}
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-lg border-2 border-gray-600"
          style={{ backgroundColor: selectedColor }}
        />
        <form onSubmit={handleHexSubmit} className="flex-1">
          <input
            type="text"
            value={hexInput}
            onChange={(e) => setHexInput(e.target.value.toUpperCase())}
            placeholder="#FFFFFF"
            maxLength={7}
            className="w-full bg-gray-700 text-white px-3 py-2 rounded text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </form>
      </div>

      {/* Preset Palette */}
      <div>
        <p className="text-gray-400 text-xs mb-2">Palette</p>
        <div className="grid grid-cols-8 gap-1">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
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

      {/* Recent Colors */}
      {recentColors.length > 0 && (
        <div>
          <p className="text-gray-400 text-xs mb-2">Recent</p>
          <div className="flex gap-1 flex-wrap">
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
        <p className="text-gray-400 text-xs mb-2">My Signature Color</p>
        <div className="flex items-center gap-2">
          {signatureColor && (
            <button
              onClick={handleUseSignature}
              className="w-8 h-8 rounded border-2 border-purple-500 hover:border-purple-400 transition-colors"
              style={{ backgroundColor: signatureColor }}
              title={`Use signature: ${signatureColor}`}
            />
          )}
          <button
            onClick={handleSetSignature}
            className="flex-1 bg-purple-600 hover:bg-purple-500 text-white text-xs py-2 px-3 rounded transition-colors"
          >
            {signatureColor ? 'Update Signature' : 'Save Current as Signature'}
          </button>
        </div>
      </div>
    </div>
  );
}
