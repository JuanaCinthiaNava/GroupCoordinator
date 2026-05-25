import { cn } from '@/lib/utils';
import { type VariantProps, cva } from 'class-variance-authority';
import type * as React from 'react';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-sm font-semibold transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-zinc-100 text-zinc-600',
        accent: 'border-transparent bg-emerald-100 text-emerald-700',
        outline: 'border-zinc-200 bg-white text-zinc-950',
        destructive: 'border-transparent bg-red-100 text-red-600',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
