'use client';

import { useState, useCallback } from 'react';
import type { ToastType } from '@/components/Toast';

export type SellToast = { id: string; type: ToastType; title: string; message?: string };

export function useSellToasts() {
  const [toasts, setToasts] = useState<SellToast[]>([]);

  const addToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).substring(2, 11);
    setToasts((prev) => [...prev, { id, type, title, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}
