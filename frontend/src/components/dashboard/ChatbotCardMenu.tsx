'use client';

import { useEffect, useRef, useState } from 'react';
import { MoreVertical, ExternalLink, Copy, Pause, Play, Trash2 } from 'lucide-react';

interface ChatbotCardMenuProps {
  isLive: boolean;
  onOpen: () => void;
  onDuplicate: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}

export function ChatbotCardMenu({
  isLive,
  onOpen,
  onDuplicate,
  onToggleActive,
  onDelete,
}: ChatbotCardMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  const runAndClose = (action: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
    action();
  };

  return (
    <div
      ref={ref}
      className="relative"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Chatbot actions"
        className="w-8 h-8 rounded-lg flex items-center justify-center text-[#86868B] hover:bg-[#F5F5F7] hover:text-[#1D1D1F] transition-all"
      >
        <MoreVertical size={18} />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-10 w-44 rounded-xl border border-[#E5E5EA] bg-white shadow-lg py-1">
          <button
            type="button"
            onClick={runAndClose(onOpen)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#1D1D1F] hover:bg-[#F5F5F7]"
          >
            <ExternalLink size={15} /> Open
          </button>
          <button
            type="button"
            onClick={runAndClose(onDuplicate)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#1D1D1F] hover:bg-[#F5F5F7]"
          >
            <Copy size={15} /> Duplicate
          </button>
          <button
            type="button"
            onClick={runAndClose(onToggleActive)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#1D1D1F] hover:bg-[#F5F5F7]"
          >
            {isLive ? <Pause size={15} /> : <Play size={15} />}
            {isLive ? 'Pause' : 'Activate'}
          </button>
          <button
            type="button"
            onClick={runAndClose(onDelete)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#FF3B30] hover:bg-[#FF3B30]/5"
          >
            <Trash2 size={15} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
