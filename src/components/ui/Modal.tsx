import * as React from 'react';
import { cn } from '@/lib/cn';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, description, children, className }: ModalProps) {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-ink/40 backdrop-blur-sm animate-fade-in" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-50 w-full max-w-lg bg-surface p-6 shadow-xl rounded-xl animate-scale-in',
          'md:mx-0 mx-4 max-h-[90vh] overflow-y-auto',
          className
        )}
      >
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        
        <div className="flex flex-col space-y-1.5 mb-5 text-center sm:text-left">
          <h2 className="font-heading text-3xl font-black tracking-tight">{title}</h2>
          {description && <p className="text-sm text-muted">{description}</p>}
        </div>
        
        {children}
      </div>
    </div>
  );
}
