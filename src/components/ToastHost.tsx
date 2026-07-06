import { ModusWcAlert, ModusWcToast } from '@trimble-oss/moduswebcomponents-react';
import { useEffect } from 'react';

import type { ToastMessage } from '@/hooks/useToasts';

interface ToastHostProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastHost({ toasts, onDismiss }: ToastHostProps) {
  useEffect(() => {
    const timers = toasts
      .map((toast) =>
        window.setTimeout(() => {
          onDismiss(toast.id);
        }, 4000),
      );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [onDismiss, toasts]);

  if (!toasts.length) return null;

  return (
    <div className="toast-host" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <ModusWcToast
          key={toast.id}
          position="bottom-end"
          delay={4000}
          customClass="toast-host__item"
        >
          <ModusWcAlert variant={toast.variant} alertTitle={toast.title}>
            {toast.message}
          </ModusWcAlert>
        </ModusWcToast>
      ))}
    </div>
  );
}
