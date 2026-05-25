'use client';

import { cn } from '@/lib/utils';
import * as React from 'react';

// Phase 6 owns the full Command palette implementation.
// Phase 1 provides the minimal surface area (Command + CommandInput + CommandList + CommandItem)
// so downstream imports do not break.

const Command = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="combobox"
      className={cn(
        'flex h-full w-full flex-col overflow-hidden rounded-md border border-zinc-200 bg-white',
        className
      )}
      {...props}
    />
  )
);
Command.displayName = 'Command';

const CommandInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="search"
    className={cn(
      'flex h-11 w-full border-b border-zinc-200 bg-transparent px-3 py-2 text-base text-zinc-950 placeholder:text-zinc-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  />
));
CommandInput.displayName = 'CommandInput';

const CommandList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="listbox"
      className={cn('max-h-[300px] overflow-y-auto', className)}
      {...props}
    />
  )
);
CommandList.displayName = 'CommandList';

const CommandItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    role="option"
    className={cn(
      'flex w-full cursor-default select-none items-center rounded-sm px-3 py-2 text-sm text-zinc-950 hover:bg-zinc-100',
      className
    )}
    {...props}
  />
));
CommandItem.displayName = 'CommandItem';

const CommandEmpty = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('py-6 text-center text-sm text-zinc-500', className)} {...props} />
);

export { Command, CommandInput, CommandList, CommandItem, CommandEmpty };
