import { cn } from '@/lib/utils';
import * as React from 'react';

// Minimal native-select wrapper for Phase 1 forms (date selectors etc.).
// Plans 01-04+ can upgrade to Radix Select on demand.

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'flex h-11 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-base text-zinc-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = 'Select';

const SelectItem = React.forwardRef<
  HTMLOptionElement,
  React.OptionHTMLAttributes<HTMLOptionElement>
>(({ className, ...props }, ref) => (
  <option ref={ref} className={cn('text-base text-zinc-950', className)} {...props} />
));
SelectItem.displayName = 'SelectItem';

export { Select, SelectItem };
