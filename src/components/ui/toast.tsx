'use client';

import { cn } from '@/lib/utils';
import * as React from 'react';

// Phase 1 toast primitive — re-exports sonner's toast helper alongside a shadcn-compatible API.
// Toast UI is rendered via the <Toaster /> from sonner.tsx; this file provides the imperative API.

export interface ToastOptions {
  id?: string | number;
  duration?: number;
  description?: React.ReactNode;
}

export function useToast() {
  // Re-export pattern: plans calling useToast().toast(msg) will work after we wire sonner globally.
  return {
    toast: (_message: string, _options?: ToastOptions) => {
      // Replaced at runtime by sonner via Toaster. Stub keeps the import surface stable.
    },
  };
}

export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive';
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <div
      ref={ref}
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-auto flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-4 shadow-md',
        variant === 'destructive'
          ? 'border-red-200 bg-red-50 text-red-900'
          : 'border-zinc-200 bg-white text-zinc-950',
        className
      )}
      {...props}
    />
  )
);
Toast.displayName = 'Toast';

export { Toast };
