import * as React from 'react';
import { cn } from '@/lib/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'accent' | 'ghost' | 'soft' | 'quiet';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'solid', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50 active:scale-95 duration-200',
          {
            'bg-ink text-surface hover:bg-ink/90': variant === 'solid',
            'bg-accent text-white hover:bg-accent/90': variant === 'accent',
            'bg-accent-soft text-accent hover:bg-accent-soft/80': variant === 'soft',
            'hover:bg-line/50 text-ink': variant === 'ghost',
            'text-muted hover:text-ink': variant === 'quiet',
            'h-8 px-3 text-sm': size === 'sm',
            'h-10 px-4 py-2': size === 'md',
            'h-12 px-6 text-lg': size === 'lg',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
