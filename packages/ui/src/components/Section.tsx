import { type HTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  spacing?: 'sm' | 'md' | 'lg';
}

const spacingClasses = {
  sm: 'py-12 md:py-16',
  md: 'py-16 md:py-24',
  lg: 'py-24 md:py-32',
};

export function Section({ className, spacing = 'md', children, ...props }: SectionProps) {
  return (
    <section className={cn(spacingClasses[spacing], className)} {...props}>
      {children}
    </section>
  );
}
