export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

export interface IToastComponentProps {
  toasts: Toast[];
  onClose: (id: string) => void;
}
