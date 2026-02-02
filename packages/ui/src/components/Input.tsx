import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error = false, type = 'text', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-10 w-full rounded-xl border bg-glass-surface px-4 py-2 text-sm',
        'text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]',
        'border-glass-border backdrop-blur-md shadow-sm',
        'transition-colors duration-normal',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40 focus-visible:border-accent-500/40',
        'disabled:cursor-not-allowed disabled:opacity-40',
        error && 'border-error/60 focus-visible:ring-error/40',
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = 'Input';
