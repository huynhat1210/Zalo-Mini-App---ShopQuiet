import React, { useEffect } from 'react';
import { Check, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const ToastItem: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, toast.duration || 3000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  const icons = {
    success: <Check size={18} className="text-emerald-600" />,
    error: <XCircle size={18} className="text-rose-600" />,
    warning: <AlertCircle size={18} className="text-amber-600" />,
    info: <Info size={18} className="text-blue-600" />,
  };

  const colors = {
    success: 'bg-emerald-50 border-emerald-200',
    error: 'bg-rose-50 border-rose-200',
    warning: 'bg-amber-50 border-amber-200',
    info: 'bg-blue-50 border-blue-200',
  };

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-2xl border shadow-lg animate-slideInRight ${colors[toast.type]}`}
      style={{ minWidth: '320px', maxWidth: '400px' }}
    >
      <div className="shrink-0 mt-0.5">{icons[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-slate-800">{toast.title}</h4>
        {toast.message && (
          <p className="text-xs text-slate-600 mt-1 line-clamp-2">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className="shrink-0 p-1 hover:bg-white/50 rounded-lg transition-colors"
      >
        <X size={14} className="text-slate-500" />
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onClose={onClose} />
        </div>
      ))}
    </div>
  );
};
