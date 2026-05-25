'use client';

import { cn } from '@/lib/utils';
import * as React from 'react';

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null);

function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <span className="relative inline-flex">{children}</span>
    </DropdownMenuContext.Provider>
  );
}

function useDropdownMenu() {
  const ctx = React.useContext(DropdownMenuContext);
  if (!ctx) throw new Error('DropdownMenu subcomponents must be used inside <DropdownMenu>');
  return ctx;
}

const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ onClick, ...props }, ref) => {
  const { open, setOpen } = useDropdownMenu();
  return (
    <button
      ref={ref}
      type="button"
      aria-expanded={open}
      onClick={(event) => {
        onClick?.(event);
        setOpen(!open);
      }}
      {...props}
    />
  );
});
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

const DropdownMenuContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { open } = useDropdownMenu();
    if (!open) return null;
    return (
      <div
        ref={ref}
        role="menu"
        className={cn(
          'absolute right-0 top-full z-20 mt-2 min-w-[180px] rounded-md border border-zinc-200 bg-white p-1 shadow-md',
          className
        )}
        {...props}
      />
    );
  }
);
DropdownMenuContent.displayName = 'DropdownMenuContent';

const DropdownMenuItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, ...props }, ref) => {
  const { setOpen } = useDropdownMenu();
  return (
    <button
      ref={ref}
      type="button"
      role="menuitem"
      className={cn(
        'flex w-full items-center rounded-sm px-3 py-2 text-sm text-zinc-950 transition-colors hover:bg-zinc-100',
        className
      )}
      onClick={(event) => {
        onClick?.(event);
        setOpen(false);
      }}
      {...props}
    />
  );
});
DropdownMenuItem.displayName = 'DropdownMenuItem';

const DropdownMenuSeparator = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div role="separator" className={cn('-mx-1 my-1 h-px bg-zinc-200', className)} {...props} />
);

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
};
