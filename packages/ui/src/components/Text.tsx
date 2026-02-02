import { createElement, type HTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';

export type TextVariant = 'body' | 'body-lg' | 'body-sm' | 'caption' | 'overline' | 'code';
export type TextTone = 'primary' | 'secondary' | 'tertiary' | 'accent';
export type TextElement = 'p' | 'span' | 'div' | 'label';

export interface TextProps extends HTMLAttributes<HTMLElement> {
  as?: TextElement;
  variant?: TextVariant;
  tone?: TextTone;
}

const variantClasses: Record<TextVariant, string> = {
  'body-lg': 'text-lg leading-relaxed',
  body: 'text-base leading-normal',
  'body-sm': 'text-sm leading-normal',
  caption: 'text-xs leading-normal tracking-wide',
  overline: 'text-xs font-medium uppercase tracking-widest',
  code: 'font-mono text-sm',
};

const toneClasses: Record<TextTone, string> = {
  primary: 'text-[var(--color-text-primary)]',
  secondary: 'text-[var(--color-text-secondary)]',
  tertiary: 'text-[var(--color-text-tertiary)]',
  accent: 'text-[var(--color-text-accent)]',
};

export function Text({
  as = 'p',
  variant = 'body',
  tone = 'primary',
  className,
  children,
  ...props
}: TextProps) {
  return createElement(
    as,
    {
      className: cn(variantClasses[variant], toneClasses[tone], className),
      ...props,
    },
    children,
  );
}
