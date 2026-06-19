import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../lib/cn.js';

export interface MotionFadeProps extends HTMLAttributes<HTMLDivElement> {
  delay?: number;
  direction?: 'up' | 'down' | 'none';
}

export function MotionFade({
  className,
  delay = 0,
  direction = 'up',
  style,
  children,
  ...props
}: MotionFadeProps) {
  const animClass =
    direction === 'up' ? 'stipulate-fade-in-up' : direction === 'down' ? 'stipulate-fade-in-down' : 'stipulate-fade-in';

  return (
    <div
      className={cn(animClass, className)}
      style={{ animationDelay: `${delay}ms`, ...style }}
      {...props}
    >
      {children}
    </div>
  );
}

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
  hover?: boolean;
}

export function GlassPanel({ className, glow = false, hover = false, children, ...props }: GlassPanelProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-glass-border bg-glass-surface p-6 shadow-glass backdrop-blur-xl',
        glow && 'stipulate-glow',
        hover && 'transition-all duration-normal hover:-translate-y-0.5 hover:bg-glass-hover hover:shadow-glass-hover',
        className,
      )}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-glass opacity-40" aria-hidden />
      <div className="relative">{children}</div>
    </div>
  );
}

export interface FeatureGridProps {
  features: Array<{ title: string; description: string; icon?: ReactNode }>;
  columns?: 2 | 3;
}

export function FeatureGrid({ features, columns = 3 }: FeatureGridProps) {
  const colClass = columns === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3';
  return (
    <div className={cn('grid gap-6', colClass)}>
      {features.map((feature, i) => (
        <MotionFade key={feature.title} delay={i * 80}>
          <GlassPanel hover className="h-full">
            {feature.icon && <div className="mb-4 text-accent-400">{feature.icon}</div>}
            <h3 className="mb-2 text-lg font-semibold text-white">{feature.title}</h3>
            <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{feature.description}</p>
          </GlassPanel>
        </MotionFade>
      ))}
    </div>
  );
}

export interface PricingCardProps {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  cta: ReactNode;
}

export function PricingCard({
  name,
  price,
  period = '/mo',
  description,
  features,
  highlighted = false,
  cta,
}: PricingCardProps) {
  return (
    <GlassPanel
      glow={highlighted}
      className={cn(
        'flex h-full flex-col',
        highlighted && 'border-accent-500/40 ring-1 ring-accent-500/20',
      )}
    >
      {highlighted && (
        <span className="mb-4 inline-flex w-fit rounded-full bg-accent-500/20 px-3 py-1 text-xs font-medium text-accent-300">
          Most popular
        </span>
      )}
      <h3 className="text-xl font-semibold text-white">{name}</h3>
      <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{description}</p>
      <div className="mt-6 flex items-baseline gap-1">
        <span className="text-4xl font-bold tracking-tight text-white">{price}</span>
        <span className="text-sm text-[var(--color-text-tertiary)]">{period}</span>
      </div>
      <ul className="mt-6 flex-1 space-y-3">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
            <span className="mt-0.5 text-accent-400">✓</span>
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-8">{cta}</div>
    </GlassPanel>
  );
}

export interface StatStripProps {
  stats: Array<{ label: string; value: string }>;
}

export function StatStrip({ stats }: StatStripProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {stats.map((stat, i) => (
        <MotionFade key={stat.label} delay={i * 60}>
          <div className="text-center">
            <p className="text-2xl font-bold text-white md:text-3xl">{stat.value}</p>
            <p className="mt-1 text-xs uppercase tracking-wider text-[var(--color-text-tertiary)]">{stat.label}</p>
          </div>
        </MotionFade>
      ))}
    </div>
  );
}

export interface TestimonialCardProps {
  quote: string;
  author: string;
  role: string;
}

export function TestimonialCard({ quote, author, role }: TestimonialCardProps) {
  return (
    <GlassPanel className="h-full">
      <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">&ldquo;{quote}&rdquo;</p>
      <div className="mt-4 border-t border-glass-border pt-4">
        <p className="text-sm font-medium text-white">{author}</p>
        <p className="text-xs text-[var(--color-text-tertiary)]">{role}</p>
      </div>
    </GlassPanel>
  );
}
