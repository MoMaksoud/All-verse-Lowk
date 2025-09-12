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
    bg: 'bg-green-900/90',
    border: 'border-green-500/20',
    icon: 'text-green-400',
    title: 'text-green-100',
    message: 'text-green-200',
  },
  error: {
    bg: 'bg-red-900/90',
    border: 'border-red-500/20',
    icon: 'text-red-400',
    title: 'text-red-100',
    message: 'text-red-200',
  },
  warning: {
    bg: 'bg-yellow-900/90',
    border: 'border-yellow-500/20',
    icon: 'text-yellow-400',
    title: 'text-yellow-100',
    message: 'text-yellow-200',
  },
  info: {
    bg: 'bg-blue-900/90',
    border: 'border-blue-500/20',
    icon: 'text-blue-400',
    title: 'text-blue-100',
    message: 'text-blue-200',
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
        fixed top-4 right-4 z-50 max-w-sm w-full
        transform transition-all duration-300 ease-in-out
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div
        className={`
          ${styles.bg} ${styles.border} border backdrop-blur-sm
          rounded-2xl p-4 shadow-xl
          flex items-start gap-3
        `}
      >
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
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
          className="flex-shrink-0 text-zinc-400 hover:text-white transition-colors"
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
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onClose} />
      ))}
    </div>
  );
}
