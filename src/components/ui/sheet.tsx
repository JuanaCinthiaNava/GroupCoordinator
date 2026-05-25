'use client';

import { cn } from '@/lib/utils';
import * as React from 'react';

// Phase 1 Sheet primitive — minimal bottom-sheet implementation.
// Replace with Radix-based shadcn Sheet on first opportunity (Plan 01-05 may swap).

interface SheetContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SheetContext = React.createContext<SheetContextValue | null>(null);

interface SheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

function Sheet({ open: controlled, onOpenChange, children }: SheetProps) {
  const [uncontrolled, setUncontrolled] = React.useState<boolean>(false);
  const open = controlled ?? uncontrolled;
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (controlled === undefined) setUncontrolled(next);
      onOpenChange?.(next);
    },
    [controlled, onOpenChange]
  );

  return <SheetContext.Provider value={{ open, setOpen }}>{children}</SheetContext.Provider>;
}

function useSheet() {
  const ctx = React.useContext(SheetContext);
  if (!ctx) throw new Error('Sheet subcomponents must be used inside <Sheet>');
  return ctx;
}

const SheetTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ onClick, ...props }, ref) => {
  const { setOpen } = useSheet();
  return (
    <button
      ref={ref}
      type="button"
      onClick={(event) => {
        onClick?.(event);
        setOpen(true);
      }}
      {...props}
    />
  );
});
SheetTrigger.displayName = 'SheetTrigger';

interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: 'top' | 'bottom' | 'left' | 'right';
}

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ className, side = 'bottom', children, ...props }, ref) => {
    const { open, setOpen } = useSheet();
    if (!open) return null;
    const sideClass =
      side === 'bottom'
        ? 'inset-x-0 bottom-0 rounded-t-lg max-h-[85vh]'
        : side === 'top'
          ? 'inset-x-0 top-0 rounded-b-lg'
          : side === 'left'
            ? 'inset-y-0 left-0 h-full w-3/4 max-w-sm rounded-r-lg'
            : 'inset-y-0 right-0 h-full w-3/4 max-w-sm rounded-l-lg';
    return (
      <div className="fixed inset-0 z-30" role="presentation" onClick={() => setOpen(false)}>
        <div className="absolute inset-0 bg-zinc-950/60" aria-hidden="true" />
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          className={cn('absolute z-10 bg-white shadow-md', sideClass, className)}
          onClick={(event) => event.stopPropagation()}
          {...props}
        >
          {side === 'bottom' && (
            <div className="mx-auto mt-3 h-1 w-8 rounded-full bg-zinc-300" aria-hidden="true" />
          )}
          {children}
        </div>
      </div>
    );
  }
);
SheetContent.displayName = 'SheetContent';

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 px-6 pt-4', className)} {...props} />
);

const SheetTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2 ref={ref} className={cn('text-xl font-semibold text-zinc-950', className)} {...props} />
  )
);
SheetTitle.displayName = 'SheetTitle';

const SheetDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-base text-zinc-500', className)} {...props} />
));
SheetDescription.displayName = 'SheetDescription';

export { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription };
