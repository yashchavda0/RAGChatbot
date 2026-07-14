'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  isModified?: boolean;
  onSave?: () => void;
  onReset?: () => void;
  isLoading?: boolean;
}

export function SettingsSection({
  title,
  description,
  children,
  actions,
  className,
  isModified,
  onSave,
  onReset,
  isLoading,
}: SettingsSectionProps) {
  return (
    <Card className={cn('transition-all duration-200', isModified && 'ring-2 ring-[#5B5EFF]/20', className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
      {(actions || onSave) && (
        <CardFooter className="flex items-center justify-between border-t border-black/[0.04] pt-4">
          {actions || (
            <div className="flex items-center gap-3">
              {isModified && (
                <span className="text-xs text-[#6E6E73]">Unsaved changes</span>
              )}
              <div className="flex-1" />
              {onReset && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onReset}
                  disabled={!isModified || isLoading}
                >
                  Reset
                </Button>
              )}
              {onSave && (
                <Button
                  size="sm"
                  onClick={onSave}
                  disabled={!isModified || isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </div>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              )}
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  );
}

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  controlClassName?: string;
}

export function SettingRow({ label, description, children, className, controlClassName }: SettingRowProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-start gap-3', className)}>
      <div className="flex-1 min-w-0 sm:pr-2">
        <label className="block text-sm font-medium text-[#1D1D1F]">{label}</label>
        {description && (
          <p className="text-[13px] text-[#6E6E73] mt-0.5">{description}</p>
        )}
      </div>
      <div className={cn('sm:w-[224px] flex-shrink-0 flex sm:justify-end', controlClassName)}>{children}</div>
    </div>
  );
}

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export function Toggle({ checked, onChange, disabled, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B5EFF]/40',
        checked ? 'bg-[#5B5EFF]' : 'bg-[#E5E5EA]',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
      {label && <span className="sr-only">{label}</span>}
    </button>
  );
}

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  showValue?: boolean;
  formatValue?: (value: number) => string;
}

export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  disabled,
  showValue = true,
  formatValue,
}: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 relative">
        <input
          type="range"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className={cn(
            'w-full h-2 appearance-none bg-transparent cursor-pointer',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            '[&::-webkit-slider-thumb]:appearance-none',
            '[&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5',
            '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#5B5EFF]',
            '[&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer',
            '[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:duration-150',
            '[&::-webkit-slider-thumb]:hover:scale-110',
            '[&::-webkit-slider-thumb]:active:scale-95',
            '[&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5',
            '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#5B5EFF]',
            '[&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-md',
            '[&::-moz-range-thumb]:cursor-pointer'
          )}
          style={{
            background: `linear-gradient(to right, #5B5EFF 0%, #5B5EFF ${percentage}%, #E5E5EA ${percentage}%, #E5E5EA 100%)`,
          }}
        />
      </div>
      {showValue && (
        <span className="w-12 text-sm font-medium text-[#1D1D1F] text-right">
          {formatValue ? formatValue(value) : value}
        </span>
      )}
    </div>
  );
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  description?: string;
}

export function TextArea({ label, description, className, ...props }: TextAreaProps) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
          {label}
        </label>
      )}
      {description && (
        <p className="text-[13px] text-[#6E6E73] mb-2">{description}</p>
      )}
      <textarea
        className={cn(
          'w-full min-h-[100px] px-4 py-3 rounded-xl border border-black/[0.08] bg-white',
          'text-[14px] text-[#1D1D1F] placeholder:text-[#6E6E73]/60',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B5EFF]/20',
          'disabled:cursor-not-allowed disabled:opacity-40 transition-all duration-200',
          'resize-y scrollbar-apple',
          className
        )}
        {...props}
      />
    </div>
  );
}

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
}

export function Select({ value, onChange, options, placeholder, disabled }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setIsOpen(false);
          }
        }}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={cn(
          'w-full flex items-center gap-2 h-10 px-3 rounded-lg border border-black/[0.08] bg-white',
          'text-[14px] text-[#1D1D1F] cursor-pointer',
          'hover:border-[#5B5EFF]/30',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B5EFF]/20',
          'disabled:cursor-not-allowed disabled:opacity-40 transition-all duration-200'
        )}
      >
        <span className={cn('flex-1 text-left truncate', !selectedOption && 'text-[#6E6E73]')}>
          {selectedOption ? selectedOption.label : placeholder || 'Select option'}
        </span>
        <svg
          className={cn('w-4 h-4 text-[#6E6E73] transition-transform', isOpen && 'rotate-180')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>

      </button>

      {isOpen && !disabled && (
        <div
          className={cn(
            'absolute top-full left-0 right-0 mt-2 z-50',
            'bg-white rounded-2xl shadow-apple-lg border border-black/[0.08]',
            'animate-scale-in overflow-hidden'
          )}
        >
          <div className="p-2 max-h-[240px] overflow-y-auto scrollbar-apple" role="listbox">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={value === option.value}
                onClick={() => handleSelect(option.value)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg text-sm transition-colors duration-150',
                  'hover:bg-[#5B5EFF]/5',
                  value === option.value && 'bg-[#5B5EFF]/10 text-[#1D1D1F] font-medium'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
      </div>
  );
}
