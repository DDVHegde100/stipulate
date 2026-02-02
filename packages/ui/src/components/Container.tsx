import { type HTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'default' | 'narrow' | 'wide';
}

const sizeClasses = {
  default: 'max-w-screen-xl',
  narrow: 'max-w-3xl',
  wide: 'max-w-screen-2xl',
};

export function Container({ className, size = 'default', children, ...props }: ContainerProps) {
  return (
    <div
      className={cn('mx-auto w-full px-6 md:px-8', sizeClasses[size], className)}
      {...props}
    >
      {children}
    </div>
  );
}
