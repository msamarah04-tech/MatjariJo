import * as React from 'react';
import { cn } from '@/lib/cn';
import { create } from 'zustand';
import { X } from 'lucide-react';

interface Toast {
  id: string;
  title: string;
  description?: string;
  type?: 'default' | 'success' | 'error';
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = crypto.randomUUID();
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const toast = (props: Omit<Toast, 'id'>) => {
  useToastStore.getState().addToast(props);
};

export function Toaster() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-0 right-0 z-50 p-4 md:p-6 w-full md:w-auto max-w-sm flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'animate-fade-up flex w-full items-start justify-between rounded-lg border bg-surface p-4 shadow-lg transition-all',
            t.type === 'error' ? 'border-red-200 text-red-900 bg-red-50' : 'border-line text-ink'
          )}
        >
          <div className="flex flex-col gap-1">
            <h4 className="text-sm font-semibold">{t.title}</h4>
            {t.description && <p className="text-sm opacity-90">{t.description}</p>}
          </div>
          <button
            onClick={() => removeToast(t.id)}
            className="rounded hover:bg-black/5 p-1 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
