'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { GlassCard } from '@/components/shared/GlassCard';

interface CreateChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string }) => void;
  isLoading?: boolean;
}

export function CreateChatbotModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: CreateChatbotModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ name?: string; description?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { name?: string; description?: string } = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!description.trim()) newErrors.description = 'Description is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({ name, description });
    setName('');
    setDescription('');
    setErrors({});
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <GlassCard
          variant="elevated"
          padding="none"
          className="w-full max-w-md animate-in fade-in zoom-in-95 duration-200"
        >
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="p-6 border-b border-[#E5E5EA]/50">
              <h2 className="text-xl font-semibold text-[#1D1D1F]">Create New Chatbot</h2>
              <p className="text-sm text-[#86868B] mt-1">
                Set up a new AI assistant for your needs
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[#1D1D1F] mb-2">
                  Chatbot Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setErrors({ ...errors, name: undefined });
                  }}
                  placeholder="e.g., Customer Support Bot"
                  className={cn(
                    'w-full px-4 py-3 rounded-xl border bg-white/50 text-[#1D1D1F] placeholder-[#86868B]',
                    'focus:outline-none focus:ring-2 focus:ring-[#5B5EFF]/20 focus:border-[#5B5EFF]',
                    'transition-all',
                    errors.name ? 'border-[#FF3B30]' : 'border-[#E5E5EA]'
                  )}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-[#FF3B30]">{errors.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-[#1D1D1F] mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    setErrors({ ...errors, description: undefined });
                  }}
                  placeholder="Describe what this chatbot will help with..."
                  rows={3}
                  className={cn(
                    'w-full px-4 py-3 rounded-xl border bg-white/50 text-[#1D1D1F] placeholder-[#86868B] resize-none',
                    'focus:outline-none focus:ring-2 focus:ring-[#5B5EFF]/20 focus:border-[#5B5EFF]',
                    'transition-all',
                    errors.description ? 'border-[#FF3B30]' : 'border-[#E5E5EA]'
                  )}
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-[#FF3B30]">{errors.description}</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-[#E5E5EA]/50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl text-sm font-medium text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className={cn(
                  'px-6 py-2 rounded-xl text-sm font-medium text-white transition-all',
                  'bg-gradient-to-r from-[#5B5EFF] to-[#8B7FFF]',
                  'hover:from-[#3D3DD9] hover:to-[#5B5EFF]',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'flex items-center gap-2'
                )}
              >
                {isLoading && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                )}
                Create Chatbot
              </button>
            </div>
          </form>
        </GlassCard>
      </div>
    </>
  );
}
