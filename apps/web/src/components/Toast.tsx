import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

const toastIcons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const toastStyles = {
  success: {
    bg: 'bg-white',
    border: 'border border-zinc-200',
    icon: 'text-green-700',
    title: 'text-zinc-900',
    message: 'text-zinc-600',
  },
  error: {
    bg: 'bg-white',
    border: 'border border-zinc-200',
    icon: 'text-red-700',
    title: 'text-zinc-900',
    message: 'text-zinc-600',
  },
  warning: {
    bg: 'bg-white',
    border: 'border border-zinc-200',
    icon: 'text-yellow-700',
    title: 'text-zinc-900',
    message: 'text-zinc-600',
  },
  info: {
    bg: 'bg-white',
    border: 'border border-zinc-200',
    icon: 'text-blue-700',
    title: 'text-zinc-900',
    message: 'text-zinc-600',
  },
};

export function Toast({ id, type, title, message, duration = 5000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const Icon = toastIcons[type];
  const styles = toastStyles[type];

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 10);
    
    // Auto dismiss
    const dismissTimer = setTimeout(() => {
      handleClose();
    }, duration);

    return () => {
      clearTimeout(timer);
      clearTimeout(dismissTimer);
    };
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose(id);
    }, 200);
  };

  return (
    <div
      className={`
        w-full
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isLeaving ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}
      `}
    >
      <div
        className={`
          ${styles.bg} ${styles.border}
          rounded-xl p-4
          flex items-start gap-3
        `}
      >
        {/* Icon */}
        <div className="shrink-0 mt-0.5">
          <Icon className={`h-5 w-5 ${styles.icon}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-semibold ${styles.title}`}>
            {title}
          </h4>
          {message && (
            <p className={`text-xs mt-1 ${styles.message}`}>
              {message}
            </p>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="shrink-0 text-zinc-600 hover:text-dark-50 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// Toast Container Component
export function ToastContainer({ toasts, onClose }: { toasts: ToastProps[]; onClose: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 space-y-2 max-w-md w-full mx-4 pointer-events-none">
      {toasts.map((toast, index) => (
        <div key={toast.id} className="pointer-events-auto" style={{ marginTop: index > 0 ? '0.5rem' : '0' }}>
          <Toast {...toast} onClose={onClose} />
        </div>
      ))}
    </div>
  );
}
