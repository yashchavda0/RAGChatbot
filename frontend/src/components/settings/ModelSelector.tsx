'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface Model {
  id: string;
  name: string;
  provider: string;
  description?: string;
  badge?: string;
  disabled?: boolean;
}

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  disabled?: boolean;
}

const availableModels: Model[] = [
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'Google',
    description: 'Best for general-purpose tasks with fast responses',
    badge: 'Recommended',
  },
  {
    id: 'gemini-ultra',
    name: 'Gemini Ultra',
    provider: 'Google',
    description: 'Most capable for complex reasoning and analysis',
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'OpenAI',
    description: 'Advanced reasoning and creative capabilities',
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'OpenAI',
    description: 'Faster GPT-4 with 128k context window',
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    description: 'Fast and cost-effective for simpler tasks',
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    description: 'Highest level of intelligence and capability',
    disabled: true,
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'Anthropic',
    description: 'Balanced performance for most use cases',
    disabled: true,
  },
];

export function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedModel = availableModels.find((m) => m.id === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (modelId: string) => {
    const model = availableModels.find((m) => m.id === modelId);
    if (!model?.disabled) {
      onChange(modelId);
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'w-full flex items-center gap-3 h-12 px-4 rounded-xl border border-black/[0.08] bg-white',
          'hover:border-[#5B5EFF]/30 transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B5EFF]/20',
          disabled && 'opacity-40 cursor-not-allowed'
        )}
      >
        {selectedModel && (
          <>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5B5EFF] to-[#7B7EFF] flex items-center justify-center">
              <span className="text-xs font-bold text-white">
                {selectedModel.provider.charAt(0)}
              </span>
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#1D1D1F]">
                  {selectedModel.name}
                </span>
                {selectedModel.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-[#34C759]/10 text-[#34C759]">
                    {selectedModel.badge}
                  </span>
                )}
              </div>
              <span className="text-xs text-[#6E6E73]">{selectedModel.provider}</span>
            </div>
          </>
        )}
        <svg
          className={cn(
            'w-4 h-4 text-[#6E6E73] transition-transform',
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
            'absolute top-full left-0 right-0 mt-2 z-50',
            'bg-white rounded-2xl shadow-apple-lg border border-black/[0.08]',
            'animate-scale-in overflow-hidden'
          )}
        >
          <div className="p-2 max-h-[320px] overflow-y-auto scrollbar-apple">
            {availableModels.map((model) => (
              <button
                key={model.id}
                type="button"
                onClick={() => handleSelect(model.id)}
                disabled={model.disabled}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200',
                  'hover:bg-[#5B5EFF]/5',
                  value === model.id && 'bg-[#5B5EFF]/10',
                  model.disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent'
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center',
                    model.disabled
                      ? 'bg-[#E5E5EA]'
                      : 'bg-gradient-to-br from-[#5B5EFF] to-[#7B7EFF]'
                  )}
                >
                  <span className={cn('text-xs font-bold', model.disabled ? 'text-[#6E6E73]' : 'text-white')}>
                    {model.provider.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#1D1D1F]">{model.name}</span>
                    {model.badge && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-[#34C759]/10 text-[#34C759]">
                        {model.badge}
                      </span>
                    )}
                    {model.disabled && (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-[#E5E5EA] text-[#6E6E73]">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  {model.description && (
                    <span className="text-xs text-[#6E6E73]">{model.description}</span>
                  )}
                </div>
                {value === model.id && (
                  <svg className="w-5 h-5 text-[#5B5EFF]" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export { availableModels };
