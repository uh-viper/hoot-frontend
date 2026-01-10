"use client";

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import '../styles/toast.css';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  const [mounted, setMounted] = useState(false);
  const [mountedPortal, setMountedPortal] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Delay portal mounting to avoid hydration mismatch
    const timer = setTimeout(() => {
      setMountedPortal(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const timers = toasts.map((toast) => {
      return setTimeout(() => {
        onRemove(toast.id);
      }, 5000); // Auto-remove after 5 seconds
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [toasts, onRemove, mounted]);

  if (!mounted || !mountedPortal || typeof window === 'undefined') return null;

  return createPortal(
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}`}
          onClick={() => onRemove(toast.id)}
        >
          <span className="toast-message">{toast.message}</span>
        </div>
      ))}
    </div>,
    document.body
  );
}
