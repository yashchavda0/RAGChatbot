'use client';

import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'subtle';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  (
    {
      className,
      variant = 'default',
      padding = 'md',
      hover = false,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      rounded-2xl
      backdrop-blur-xl
      border
      transition-all
      duration-300
    `;

    const variants = {
      default: `
        bg-white/70
        border-white/20
        shadow-[0_8px_32px_rgba(0,0,0,0.08)]
      `,
      elevated: `
        bg-white/80
        border-white/30
        shadow-[0_12px_48px_rgba(0,0,0,0.12)]
      `,
      subtle: `
        bg-white/50
        border-white/10
        shadow-[0_4px_16px_rgba(0,0,0,0.04)]
      `,
    };

    const paddings = {
      none: 'p-0',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    const hoverStyles = hover
      ? 'hover:shadow-[0_12px_48px_rgba(91,94,255,0.15)] hover:border-[#5B5EFF]/30 hover:-translate-y-0.5'
      : '';

    return (
      <div
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          paddings[padding],
          hoverStyles,
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';

export { GlassCard };
