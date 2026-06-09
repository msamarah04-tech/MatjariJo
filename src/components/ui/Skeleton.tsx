import * as React from 'react';
import { cn } from '@/lib/cn';

/** Low-level shimmer block. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-lg bg-line/60', className)} {...props} />;
}

/** A row of KPI-card skeletons that mirror the real KPI grid. */
export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <Skeleton className="mb-4 h-3 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      ))}
    </div>
  );
}

/** A stack of list-row skeletons. */
export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      ))}
    </div>
  );
}
