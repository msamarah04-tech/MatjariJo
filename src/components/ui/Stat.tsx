import * as React from 'react';
import { cn } from '@/lib/cn';
import { LucideIcon } from 'lucide-react';

interface StatProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  className?: string;
}

export function Stat({ label, value, icon: Icon, className }: StatProps) {
  return (
    <div className={cn('bg-surface border border-line p-6 rounded-2xl shadow-sm flex flex-col items-start', className)}>
      <div className="flex items-center text-muted mb-2">
        {Icon && <Icon className="w-3.5 h-3.5 mr-2" />}
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <div className="font-black text-4xl text-ink">
        {value}
      </div>
    </div>
  );
}
