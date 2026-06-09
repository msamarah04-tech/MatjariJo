import * as React from 'react';
import { cn } from '@/lib/cn';

// ---------------------------------------------------------------------------
// Presentational dashboard primitives shared by the platform and admin shells.
// Kept area-neutral (no store coupling) so both /platform and /admin can reuse
// them. Area-specific selectors (badges, notifications) live in each area's own
// shared module.
// ---------------------------------------------------------------------------

export const CHART_COLORS = ['#E04E27', '#059669', '#D97706', '#2563EB', '#7C3AED', '#0891B2', '#DB2777', '#111827'];

/** Compact page header sized for the sidebar layout (vs. the large SectionHeader). */
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 border-b border-line pb-5 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <h1 className="font-heading text-4xl font-black tracking-tight text-ink md:text-5xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Inline SVG sparkline from a series of numbers. */
export function Sparkline({ data, color = '#E04E27', className }: { data: number[]; color?: string; className?: string }) {
  const width = 96;
  const height = 28;
  if (!data.length) return <svg width={width} height={height} className={className} aria-hidden />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const points = data.map((value, index) => {
    const x = index * step;
    const y = height - ((value - min) / span) * height;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden preserveAspectRatio="none">
      <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Segmented control used for filter chips and range pickers. */
export function SegmentedControl<T extends string | number>({ options, value, onChange }: { options: { label: string; value: T; count?: number }[]; value: T; onChange: (value: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1 shadow-xs">
      {options.map((option) => (
        <button
          key={String(option.value)}
          onClick={() => onChange(option.value)}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors',
            value === option.value ? 'bg-ink text-surface' : 'text-muted hover:bg-paper hover:text-ink'
          )}
        >
          {option.label}
          {option.count !== undefined && (
            <span className={cn('rounded-full px-1.5 text-[10px]', value === option.value ? 'bg-surface/20' : 'bg-paper text-muted')}>{option.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function ChartCard({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-surface p-5 shadow-sm md:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-heading text-2xl font-black tracking-tight text-ink">{title}</h3>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function StoreAvatar({ emoji, url, name, size = 'md' }: { emoji?: string; url?: string; name: string; size?: 'sm' | 'md' }) {
  const dims = size === 'sm' ? 'h-9 w-9 text-lg' : 'h-12 w-12 text-2xl';
  return (
    <div className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-paper', dims)}>
      {url ? <img src={url} alt={name} className="h-full w-full object-cover" /> : (emoji || '🛍️')}
    </div>
  );
}
