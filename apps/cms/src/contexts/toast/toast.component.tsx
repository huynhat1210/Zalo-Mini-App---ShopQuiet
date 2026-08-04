import React, { createContext, useState, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Toast, ToastType } from '../../components/toast';

interface ToastContextType {
  toasts: Toast[];
  showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  confirm: (title: string, message?: string) => Promise<boolean>;
  removeToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);
import { useToast } from './toast.hook';
export { useToast };

import type { IToastComponentProps } from './toast.type';

export const ToastProviderComponent: React.FC<IToastComponentProps> = (props) => {
  const { children } = props;
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmation, setConfirmation] = useState<{
    title: string;
    message?: string;
    resolve: (approved: boolean) => void;
  } | null>(null);

  const showToast = useCallback(
    (type: ToastType, title: string, message?: string, duration?: number) => {
      const id = Math.random().toString(36).substring(7);
      const newToast: Toast = { id, type, title, message, duration };
      setToasts((prev) => [...prev, newToast]);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback(
    (title: string, message?: string) => {
      showToast('success', title, message);
    },
    [showToast]
  );

  const error = useCallback(
    (title: string, message?: string) => {
      showToast('error', title, message, 5000);
    },
    [showToast]
  );

  const warning = useCallback(
    (title: string, message?: string) => {
      showToast('warning', title, message);
    },
    [showToast]
  );

  const info = useCallback(
    (title: string, message?: string) => {
      showToast('info', title, message);
    },
    [showToast]
  );

  const confirm = useCallback((title: string, message?: string) => (
    new Promise<boolean>((resolve) => setConfirmation({ title, message, resolve }))
  ), []);

  const resolveConfirmation = useCallback((approved: boolean) => {
    setConfirmation((current) => {
      current?.resolve(approved);
      return null;
    });
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, success, error, warning, info, confirm, removeToast }}>
      {children}
      {confirmation && (
        <div className="fixed top-4 right-4 z-[110] w-[min(24rem,calc(100vw-2rem))] border border-amber-200 bg-amber-50 p-4 shadow-lg">
          <div className="flex gap-3">
            <AlertTriangle size={19} className="mt-0.5 shrink-0 text-amber-700" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-800">{confirmation.title}</p>
              {confirmation.message && <p className="mt-1 text-xs text-slate-600">{confirmation.message}</p>}
              <div className="mt-3 flex justify-end gap-2">
                <button type="button" onClick={() => resolveConfirmation(false)} className="px-3 py-1.5 text-xs font-semibold text-slate-700">Hủy</button>
                <button type="button" onClick={() => resolveConfirmation(true)} className="bg-rose-600 px-3 py-1.5 text-xs font-bold text-white">Xác nhận</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};
