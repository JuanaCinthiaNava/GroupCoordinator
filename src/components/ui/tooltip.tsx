'use client';

import { cn } from '@/lib/utils';
import * as React from 'react';

// Minimal tooltip — show on hover/focus. Phase 7 polish can swap to Radix Tooltip.

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className={cn(
            'absolute z-50 rounded-md bg-zinc-950 px-2 py-1 text-xs font-medium text-white shadow-md',
            side === 'top' && 'bottom-full mb-2',
            side === 'bottom' && 'top-full mt-2',
            side === 'left' && 'right-full mr-2',
            side === 'right' && 'left-full ml-2'
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}

const TooltipTrigger = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const TooltipContent = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent };
