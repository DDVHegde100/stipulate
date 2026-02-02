import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-accent text-white shadow-accent hover:brightness-110 active:brightness-95 border border-accent-500/20',
  secondary:
    'bg-glass-surface text-[var(--color-text-primary)] border border-glass-border hover:bg-glass-hover shadow-glass hover:shadow-glass-hover backdrop-blur-md',
  ghost:
    'bg-transparent text-[var(--color-text-secondary)] hover:bg-glass-surface hover:text-[var(--color-text-primary)]',
  outline:
    'bg-transparent text-[var(--color-text-primary)] border border-glass-border hover:border-[var(--color-glass-border-strong)] hover:bg-glass-surface backdrop-blur-sm',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm rounded-lg gap-1.5',
  md: 'h-10 px-4 text-sm rounded-xl gap-2',
  lg: 'h-12 px-6 text-base rounded-xl gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', type = 'button', children, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-normal ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950',
        'disabled:pointer-events-none disabled:opacity-40',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);

Button.displayName = 'Button';
