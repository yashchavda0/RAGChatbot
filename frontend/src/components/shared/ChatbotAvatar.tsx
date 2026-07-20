'use client';

import { cn } from '@/lib/utils';
import { CHATBOT_ICONS, getAvatarColor } from '@/lib/utils/chatbotIcons';

interface ChatbotAvatarProps {
  id: string;
  icon?: string;
  isLive?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function ChatbotAvatar({ id, icon, isLive, size = 'md', className }: ChatbotAvatarProps) {
  const Icon = (icon && CHATBOT_ICONS[icon]) || CHATBOT_ICONS.chat;
  const color = getAvatarColor(id);
  const dimensionClass = size === 'sm' ? 'w-9 h-9' : 'w-11 h-11';
  const iconSize = size === 'sm' ? 16 : 20;

  return (
    <div className={cn('relative flex-shrink-0', className)}>
      <div
        className={cn(dimensionClass, 'rounded-xl flex items-center justify-center')}
        style={{ backgroundColor: color }}
      >
        <Icon className="text-white" size={iconSize} strokeWidth={2} />
      </div>
      {isLive !== undefined && (
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
          style={{ backgroundColor: isLive ? '#34C759' : '#8E8E93' }}
        />
      )}
    </div>
  );
}
