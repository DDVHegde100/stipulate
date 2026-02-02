import { createElement, type HTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';

export type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4';
export type HeadingSize = 'hero' | 'xl' | 'lg' | 'md' | 'sm';

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: HeadingLevel;
  size?: HeadingSize;
  gradient?: boolean;
}

const sizeClasses: Record<HeadingSize, string> = {
  hero: 'text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-none',
  xl: 'text-4xl md:text-5xl font-semibold tracking-tight',
  lg: 'text-3xl md:text-4xl font-semibold tracking-tight',
  md: 'text-2xl md:text-3xl font-semibold tracking-tight',
  sm: 'text-xl md:text-2xl font-medium tracking-tight',
};

export function Heading({
  as = 'h2',
  size = 'md',
  gradient = false,
  className,
  children,
  ...props
}: HeadingProps) {
  return createElement(
    as,
    {
      className: cn(
        'font-display text-[var(--color-text-primary)]',
        sizeClasses[size],
        gradient && 'stipulate-text-gradient bg-clip-text text-transparent',
        className,
      ),
      ...props,
    },
    children,
  );
}
