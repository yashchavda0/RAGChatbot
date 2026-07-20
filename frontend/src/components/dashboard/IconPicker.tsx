'use client';

import { cn } from '@/lib/utils';
import { CHATBOT_ICONS, type ChatbotIconKey } from '@/lib/utils/chatbotIcons';

interface IconPickerProps {
  value: ChatbotIconKey;
  onChange: (icon: ChatbotIconKey) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {(Object.keys(CHATBOT_ICONS) as ChatbotIconKey[]).map((key) => {
        const Icon = CHATBOT_ICONS[key];
        const selected = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-label={key}
            aria-pressed={selected}
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center border transition-all',
              selected
                ? 'border-[#5B5EFF] bg-[#5B5EFF]/10 text-[#5B5EFF]'
                : 'border-[#E5E5EA] text-[#86868B] hover:border-[#5B5EFF]/50'
            )}
          >
            <Icon size={18} strokeWidth={2} />
          </button>
        );
      })}
    </div>
  );
}
