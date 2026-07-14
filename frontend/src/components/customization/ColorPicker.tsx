'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  presets?: string[];
  label?: string;
}

const defaultPresets = [
  '#5B5EFF', // Primary indigo
  '#4040DD', // Dark indigo
  '#7B7EFF', // Light indigo
  '#FF3B30', // Red
  '#FF9500', // Orange
  '#FFCC00', // Yellow
  '#34C759', // Green
  '#00C7BE', // Teal
  '#007AFF', // Blue
  '#5856D6', // Purple
  '#AF52DE', // Magenta
  '#FF2D55', // Pink
];

export function ColorPicker({
  value,
  onChange,
  presets = defaultPresets,
  label,
}: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customColor, setCustomColor] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCustomColor(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePresetClick = (color: string) => {
    onChange(color);
    setCustomColor(color);
    setIsOpen(false);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setCustomColor(newColor);
    onChange(newColor);
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center gap-3 h-10 px-3 rounded-lg border border-black/[0.08] bg-white',
          'hover:border-[#5B5EFF]/30 transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B5EFF]/20'
        )}
      >
        <div
          className="w-6 h-6 rounded-lg border border-black/10 shadow-sm"
          style={{ backgroundColor: value }}
        />
        <span className="text-sm font-medium text-[#1D1D1F] uppercase">
          {value}
        </span>
        <svg
          className={cn(
            'w-4 h-4 text-[#6E6E73] transition-transform ml-auto',
            isOpen && 'rotate-180'
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute top-full right-0 mt-2 z-50 p-3.5 w-[280px] max-w-[min(280px,calc(100vw-2rem))]',
            'bg-white rounded-2xl shadow-apple-lg border border-black/[0.08]',
            'animate-scale-in'
          )}
        >
          {/* Preset Colors */}
          <div className="mb-3.5">
            <p className="text-xs font-medium text-[#6E6E73] mb-2.5">Preset Colors</p>
            <div className="grid grid-cols-6 gap-2">
              {presets.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handlePresetClick(color)}
                  className={cn(
                    'w-8 h-8 rounded-lg transition-all duration-200',
                    'hover:scale-110 active:scale-95',
                    'border-2',
                    value === color ? 'border-[#1D1D1F] shadow-md' : 'border-transparent'
                  )}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Custom Color */}
          <div>
            <p className="text-xs font-medium text-[#6E6E73] mb-2.5">Custom Color</p>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={customColor}
                onChange={handleCustomChange}
                className="w-9 h-9 rounded-lg cursor-pointer border-0 p-0.5 bg-transparent"
              />
              <input
                type="text"
                value={customColor.toUpperCase()}
                onChange={(e) => {
                  const newColor = e.target.value;
                  if (/^#[0-9A-Fa-f]{6}$/.test(newColor)) {
                    setCustomColor(newColor);
                    onChange(newColor);
                  }
                }}
                placeholder="#5B5EFF"
                className="flex-1 h-9 px-3 rounded-lg border border-black/[0.08] text-sm text-[#1D1D1F] uppercase focus:outline-none focus:ring-2 focus:ring-[#5B5EFF]/20"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
