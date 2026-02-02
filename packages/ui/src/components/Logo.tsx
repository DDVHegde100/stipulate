import { type HTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';

export type LogoVariant = 'full' | 'wordmark' | 'icon';

export const logoPaths: Record<LogoVariant, string> = {
  full: '/stipulate/logo-full.svg',
  wordmark: '/stipulate/logo-wordmark.svg',
  icon: '/stipulate/logo-icon.svg',
};

export interface LogoProps extends HTMLAttributes<HTMLImageElement> {
  variant?: LogoVariant;
  src?: string;
  alt?: string;
}

const sizeClasses: Record<LogoVariant, string> = {
  full: 'h-8 w-auto',
  wordmark: 'h-7 w-auto',
  icon: 'h-10 w-10',
};

export function Logo({
  className,
  variant = 'full',
  src,
  alt = 'Stipulate',
  ...props
}: LogoProps) {
  return (
    <img
      src={src ?? logoPaths[variant]}
      alt={alt}
      className={cn(sizeClasses[variant], className)}
      {...props}
    />
  );
}
