'use client';

import { cn } from '@/lib/utils';

interface WidgetPreviewProps {
  primaryColor: string;
  position: 'bottom-right' | 'bottom-left';
  size: 'compact' | 'default' | 'large';
  borderRadius: number;
  fontFamily: string;
  greeting: string;
  welcomeMessage: string;
  placeholder: string;
  botName: string;
  avatarUrl?: string;
  autoOpen: boolean;
}

const sizeConfig = {
  compact: {
    widget: 'w-[320px]',
    button: 'w-12 h-12',
    fontSize: 'text-[13px]',
    inputHeight: 'h-9',
  },
  default: {
    widget: 'w-[380px]',
    button: 'w-14 h-14',
    fontSize: 'text-[14px]',
    inputHeight: 'h-10',
  },
  large: {
    widget: 'w-[440px]',
    button: 'w-16 h-16',
    fontSize: 'text-[15px]',
    inputHeight: 'h-11',
  },
};

const fontFamilies: Record<string, string> = {
  'Inter': "'Inter', sans-serif",
  'SF Pro': "'SF Pro Display', -apple-system, sans-serif",
  'Roboto': "'Roboto', sans-serif",
  'Open Sans': "'Open Sans', sans-serif",
  'Lato': "'Lato', sans-serif",
};

export function WidgetPreview({
  primaryColor,
  position,
  size,
  borderRadius,
  fontFamily,
  greeting,
  welcomeMessage,
  placeholder,
  botName,
  avatarUrl,
  autoOpen,
}: WidgetPreviewProps) {
  const config = sizeConfig[size];
  const positionClass = position === 'bottom-right' ? 'right-6' : 'left-6';
  const selectedFont = fontFamilies[fontFamily] || fontFamilies['Inter'];

  return (
    <div className="relative w-full h-[600px] bg-gradient-to-br from-[#E8E8ED] to-[#D1D1D6] rounded-2xl overflow-hidden">
      {/* Mock website background */}
      <div className="absolute inset-0">
        <div className="absolute top-4 left-4 right-4 h-12 bg-white/50 rounded-lg" />
        <div className="absolute top-20 left-4 right-4 space-y-3">
          <div className="h-4 bg-white/30 rounded w-3/4" />
          <div className="h-4 bg-white/30 rounded w-1/2" />
          <div className="h-4 bg-white/30 rounded w-2/3" />
        </div>
        <div className="absolute top-40 left-4 right-4 grid grid-cols-3 gap-3">
          <div className="h-24 bg-white/40 rounded-lg" />
          <div className="h-24 bg-white/40 rounded-lg" />
          <div className="h-24 bg-white/40 rounded-lg" />
        </div>
      </div>

      {/* Chat Widget Preview */}
      <div
        className={cn('absolute bottom-6', positionClass)}
        style={{ fontFamily: selectedFont }}
      >
        {/* Chat Window */}
        <div
          className={cn(
            'bg-white shadow-apple-lg overflow-hidden mb-4',
            config.widget,
            'animate-scale-in'
          )}
          style={{ borderRadius: `${borderRadius}px` }}
        >
          {/* Header */}
          <div
            className="p-4 text-white"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={botName}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm">{botName}</h4>
                <p className="text-xs opacity-80">Online</p>
              </div>
              <button className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="h-72 overflow-y-auto p-4 space-y-4 scrollbar-apple">
            {/* Welcome Message */}
            <div className="flex gap-2">
              <div
                className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <svg className="w-4 h-4" fill={primaryColor} viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                  </svg>
                )}
              </div>
              <div
                className={cn('flex-1 p-3', config.fontSize)}
                style={{
                  backgroundColor: '#F5F5F7',
                  borderRadius: `${Math.max(4, borderRadius - 10)}px`,
                }}
              >
                <p className="font-medium text-[#1D1D1F] mb-1">{greeting}</p>
                <p className="text-[#6E6E73]">{welcomeMessage}</p>
              </div>
            </div>

            {/* Sample user message */}
            <div className="flex justify-end">
              <div
                className="px-4 py-2.5 text-white rounded-2xl rounded-br-sm"
                style={{
                  backgroundColor: primaryColor,
                  fontSize: config.fontSize === 'text-[13px]' ? '13px' : config.fontSize === 'text-[15px]' ? '15px' : '14px',
                }}
              >
                How can I get started?
              </div>
            </div>

            {/* Bot response */}
            <div className="flex gap-2">
              <div
                className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <svg className="w-4 h-4" fill={primaryColor} viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                </svg>
              </div>
              <div
                className="flex-1 p-3 bg-[#F5F5F7]"
                style={{
                  borderRadius: `${Math.max(4, borderRadius - 10)}px`,
                  fontSize: config.fontSize === 'text-[13px]' ? '13px' : config.fontSize === 'text-[15px]' ? '15px' : '14px',
                }}
              >
                <p className="text-[#1D1D1F]">
                  I'd be happy to help you get started! Here are some quick steps to begin...
                </p>
              </div>
            </div>
          </div>

          {/* Input Area */}
          <div className="p-3 border-t border-black/[0.06]">
            <div
              className={cn(
                'flex items-center gap-2 px-3 border border-black/[0.08] rounded-xl',
                config.inputHeight
              )}
              style={{ borderRadius: `${Math.max(8, borderRadius - 4)}px` }}
            >
              <input
                type="text"
                placeholder={placeholder}
                className={cn(
                  'flex-1 bg-transparent outline-none text-[#1D1D1F] placeholder:text-[#6E6E73]/60',
                  config.fontSize
                )}
                readOnly
              />
              <button
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white transition-colors"
                style={{ backgroundColor: primaryColor }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Chat Bubble Button */}
        <div className="flex justify-end">
          <button
            className={cn(
              'flex items-center justify-center text-white shadow-apple-lg hover-lift',
              config.button
            )}
            style={{
              backgroundColor: primaryColor,
              borderRadius: `${borderRadius / 2}px`,
            }}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Preview Label */}
      <div className="absolute top-3 left-3 px-3 py-1.5 bg-black/50 backdrop-blur-sm rounded-lg">
        <span className="text-xs font-medium text-white">Live Preview</span>
      </div>
    </div>
  );
}
