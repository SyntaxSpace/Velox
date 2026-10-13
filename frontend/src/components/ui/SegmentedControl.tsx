'use client';

import React from 'react';
import { motion } from 'framer-motion';

export interface SegmentOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

interface SegmentedControlProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  className = '',
  size = 'md',
}: SegmentedControlProps<T>) {
  const containerPadding = size === 'sm' ? 'p-0.5' : 'p-1';
  const itemPadding =
    size === 'sm'
      ? 'px-2.5 py-1 text-xs'
      : size === 'lg'
        ? 'px-4 py-2 text-sm'
        : 'px-3 py-1.5 text-xs sm:text-sm';

  return (
    <div
      role="radiogroup"
      className={`relative inline-flex items-center rounded-xl bg-neutral-200/60 dark:bg-neutral-800/80 backdrop-blur-sm ${containerPadding} ${className}`}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        const Icon = option.icon;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(option.value)}
            className={`relative z-10 flex items-center justify-center gap-1.5 font-medium rounded-lg transition-colors select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${itemPadding} ${
              isSelected
                ? 'text-foreground font-semibold shadow-sm'
                : 'text-muted hover:text-foreground'
            }`}
          >
            {isSelected && (
              <motion.div
                layoutId="segmented-pill-bg"
                className="absolute inset-0 rounded-lg bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] dark:bg-neutral-900 border border-border/40"
                transition={{
                  type: 'spring',
                  damping: 28,
                  stiffness: 400,
                }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
              <span>{option.label}</span>
              {option.badge !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected
                      ? 'bg-neutral-200/70 text-foreground dark:bg-neutral-800'
                      : 'bg-neutral-300/60 text-muted dark:bg-neutral-700/60'
                  }`}
                >
                  {option.badge}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
