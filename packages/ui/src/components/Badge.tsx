import { type HTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';

export type BadgeVariant = 'default' | 'accent' | 'success' | 'warning' | 'outline';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-glass-surface text-[var(--color-text-secondary)] border-glass-border',
  accent: 'bg-accent-500/15 text-accent-300 border-accent-500/25',
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  outline: 'bg-transparent text-[var(--color-text-secondary)] border-glass-border',
};

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
