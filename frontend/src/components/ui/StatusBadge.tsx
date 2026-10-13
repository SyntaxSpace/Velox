'use client';

import React from 'react';

export type StatusType =
  | 'PENDING'
  | 'WAITING'
  | 'ASSIGNED'
  | 'DOWNLOADING'
  | 'PRINTING'
  | 'COMPLETED'
  | 'COLLECTED'
  | 'CANCELLED'
  | 'ONLINE'
  | 'OFFLINE'
  | 'PAUSED'
  | 'ERROR'
  | string;

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  className?: string;
}

export default function StatusBadge({
  status,
  label,
  size = 'md',
  showDot = true,
  className = '',
}: StatusBadgeProps) {
  const normalized = (status || '').toUpperCase();

  // Apple HIG-inspired tinted semantic colors
  let config: {
    bg: string;
    text: string;
    border: string;
    dotBg: string;
    pulse?: boolean;
    defaultLabel: string;
  } = {
    bg: 'bg-neutral-100 dark:bg-neutral-800',
    text: 'text-neutral-700 dark:text-neutral-300',
    border: 'border-neutral-200/60 dark:border-neutral-700/60',
    dotBg: 'bg-neutral-400',
    defaultLabel: status,
  };

  switch (normalized) {
    case 'ONLINE':
    case 'COMPLETED':
    case 'COLLECTED':
    case 'PAID':
    case 'SUCCESS':
      config = {
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
        text: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-500/20 dark:border-emerald-500/30',
        dotBg: 'bg-emerald-500',
        pulse: normalized === 'ONLINE',
        defaultLabel:
          normalized === 'ONLINE'
            ? 'Online'
            : normalized === 'COLLECTED'
              ? 'Collected'
              : 'Completed',
      };
      break;

    case 'PRINTING':
    case 'DOWNLOADING':
    case 'ASSIGNED':
      config = {
        bg: 'bg-blue-500/10 dark:bg-blue-500/15',
        text: 'text-blue-700 dark:text-blue-400',
        border: 'border-blue-500/20 dark:border-blue-500/30',
        dotBg: 'bg-blue-500',
        pulse: true,
        defaultLabel:
          normalized === 'PRINTING'
            ? 'Printing'
            : normalized === 'DOWNLOADING'
              ? 'Downloading'
              : 'Assigned',
      };
      break;

    case 'WAITING':
    case 'PENDING':
    case 'QUEUED':
      config = {
        bg: 'bg-amber-500/10 dark:bg-amber-500/15',
        text: 'text-amber-700 dark:text-amber-400',
        border: 'border-amber-500/20 dark:border-amber-500/30',
        dotBg: 'bg-amber-500',
        pulse: normalized === 'WAITING',
        defaultLabel: normalized === 'WAITING' ? 'Waiting in Queue' : 'Payment Pending',
      };
      break;

    case 'OFFLINE':
    case 'CANCELLED':
    case 'ERROR':
    case 'FAILED':
      config = {
        bg: 'bg-red-500/10 dark:bg-red-500/15',
        text: 'text-red-700 dark:text-red-400',
        border: 'border-red-500/20 dark:border-red-500/30',
        dotBg: 'bg-red-500',
        defaultLabel:
          normalized === 'OFFLINE'
            ? 'Offline'
            : normalized === 'CANCELLED'
              ? 'Cancelled'
              : 'Failed',
      };
      break;

    case 'PAUSED':
      config = {
        bg: 'bg-purple-500/10 dark:bg-purple-500/15',
        text: 'text-purple-700 dark:text-purple-400',
        border: 'border-purple-500/20 dark:border-purple-500/30',
        dotBg: 'bg-purple-500',
        defaultLabel: 'Paused',
      };
      break;
  }

  const sizeClasses =
    size === 'sm'
      ? 'text-[11px] px-2 py-0.5 gap-1.5'
      : size === 'lg'
        ? 'text-xs px-3 py-1 gap-2 font-semibold'
        : 'text-xs px-2.5 py-0.5 gap-1.5 font-medium';

  const dotSizeClasses = size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2';

  return (
    <span
      className={`inline-flex items-center rounded-full border tracking-[0.01em] transition-colors ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${className}`}
    >
      {showDot && (
        <span className="relative flex shrink-0 items-center justify-center">
          {config.pulse && (
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${config.dotBg}`}
            />
          )}
          <span className={`relative inline-flex rounded-full ${dotSizeClasses} ${config.dotBg}`} />
        </span>
      )}
      <span>{label || config.defaultLabel}</span>
    </span>
  );
}
