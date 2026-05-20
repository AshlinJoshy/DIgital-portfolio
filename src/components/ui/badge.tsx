import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wider transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary/10 text-primary',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'text-foreground border-border',
        accent: 'border-transparent bg-accent/15 text-accent-foreground',
        success: 'border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
        warning: 'border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300',
        danger: 'border-transparent bg-rose-500/15 text-rose-700 dark:text-rose-300',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
