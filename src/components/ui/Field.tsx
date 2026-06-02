import * as React from 'react';
import { cn } from '@/lib/cn';

interface FieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function Field({ label, error, children, className }: FieldProps) {
  return (
    <div className={cn('flex flex-col space-y-1.5 w-full', className)}>
      <label className="text-sm font-medium leading-none text-ink pb-1">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-sm text-red-500 font-medium">{error}</p>
      )}
    </div>
  );
}
