import * as React from 'react';
import { cn } from '@/lib/cn';

interface SectionHeaderProps {
  kicker?: string;
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ kicker, title, subtitle, rightSlot, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex flex-col md:flex-row md:items-end justify-between pb-6 mb-12 gap-4', className)}>
      <div className="flex flex-col">
        {kicker && <span className="text-muted text-[10px] font-bold tracking-[0.2em] uppercase mb-4">{kicker}</span>}
        <h2 className="font-heading font-black text-6xl tracking-tight leading-[0.9] text-ink">{title}</h2>
        {subtitle && <p className="text-muted mt-4 text-lg max-w-md">{subtitle}</p>}
      </div>
      {rightSlot && <div className="shrink-0">{rightSlot}</div>}
    </div>
  );
}
