import * as React from 'react';
import { cn } from '@/lib/cn';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center p-12 border border-[#E7E0D3] bg-surface rounded-2xl shadow-sm', className)}>
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-paper flex items-center justify-center mb-6 border border-line">
          <Icon className="w-5 h-5 text-ink" />
        </div>
      )}
      <h3 className="font-heading text-3xl font-black text-ink mb-3">{title}</h3>
      <p className="text-muted max-w-sm mb-6 text-sm">{description}</p>
      {action}
    </div>
  );
}
