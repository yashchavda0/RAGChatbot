import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, icon, suffix, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            `flex h-10 w-full rounded-lg border bg-transparent px-3 py-2 text-sm
             ring-offset-background transition-all duration-200
             placeholder:text-muted-foreground/60
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
             focus-visible:ring-offset-1
             disabled:cursor-not-allowed disabled:opacity-40
             dark:bg-input/50`,
            icon && 'pl-10',
            suffix && 'pr-10',
            error && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          ref={ref}
          {...props}
        />
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {suffix}
          </div>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
