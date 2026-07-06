import { useCallback, useState } from 'react';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface ToastMessage {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
}

let toastCounter = 0;

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${++toastCounter}`;
    setToasts((current) => [...current, { ...toast, id }]);
    return id;
  }, []);

  return { toasts, pushToast, dismissToast };
}
