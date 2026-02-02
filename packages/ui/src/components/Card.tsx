import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';

export type CardVariant = 'glass' | 'solid' | 'outline';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const variantClasses: Record<CardVariant, string> = {
  glass: cn(
    'bg-glass-surface border border-glass-border shadow-glass backdrop-blur-md',
    'before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit]',
    'before:bg-gradient-glass before:opacity-50',
  ),
  solid: 'bg-ink-900 border border-ink-800 shadow-md',
  outline: 'bg-transparent border border-glass-border',
};

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'glass', hover = false, padding = 'md', children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative overflow-hidden rounded-2xl',
        variantClasses[variant],
        paddingClasses[padding],
        hover &&
          variant === 'glass' &&
          'transition-all duration-normal hover:bg-glass-hover hover:border-[var(--color-glass-border-strong)] hover:shadow-glass-hover',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);

Card.displayName = 'Card';
