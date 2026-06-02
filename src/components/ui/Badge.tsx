import * as React from 'react';
import { cn } from '@/lib/cn';
import { OrderStatus, StoreStatus } from '@/lib/types';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline' | 'pending' | 'approved' | 'rejected' | 'fulfilled';
  className?: string;
  children?: React.ReactNode;
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors focus:outline-none focus:ring-2 focus:ring-accent',
        {
          'bg-ink text-surface': variant === 'default',
          'border border-line text-ink': variant === 'outline',
          'bg-amber-100 text-amber-800': variant === 'pending',
          'bg-green-100 text-green-800': variant === 'approved',
          'bg-red-100 text-red-800': variant === 'rejected',
          'bg-blue-100 text-blue-800': variant === 'fulfilled',
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function StatusBadge({ status }: { status: OrderStatus | StoreStatus }) {
  let variant: BadgeProps['variant'] = 'default';
  
  if (status === 'PENDING') variant = 'pending';
  else if (status === 'APPROVED') variant = 'approved';
  else if (status === 'REJECTED') variant = 'rejected';
  else if (status === 'FULFILLED') variant = 'fulfilled';
  else if (status === 'ACTIVE') variant = 'approved';
  else if (status === 'SUSPENDED') variant = 'rejected';

  return <Badge variant={variant}>{status}</Badge>;
}
