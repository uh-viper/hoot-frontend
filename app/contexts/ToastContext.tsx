"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ToastContainer, Toast, ToastType } from '../components/Toast';

interface ToastContextType {
  showToast: (message: string, type?: ToastType, action?: { label: string; onClick: () => void }) => string;
  showError: (message: string) => string;
  showSuccess: (message: string, action?: { label: string; onClick: () => void }) => string;
  showWarning: (message: string) => string;
  showInfo: (message: string) => string;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', action?: { label: string; onClick: () => void }) => {
    const id = Math.random().toString(36).substring(7);
    const newToast: Toast = { id, message, type, action };
    
    setToasts((prev) => {
      // Prevent duplicate toasts with the same message
      if (prev.some(t => t.message === message && t.type === type)) {
        return prev;
      }
      return [...prev, newToast];
    });
    
    return id;
  }, []);

  const showError = useCallback((message: string) => {
    return showToast(message, 'error');
  }, [showToast]);

  const showSuccess = useCallback((message: string, action?: { label: string; onClick: () => void }) => {
    return showToast(message, 'success', action);
  }, [showToast]);

  const showWarning = useCallback((message: string) => {
    return showToast(message, 'warning');
  }, [showToast]);

  const showInfo = useCallback((message: string) => {
    return showToast(message, 'info');
  }, [showToast]);

  return (
    <ToastContext.Provider
      value={{
        showToast,
        showError,
        showSuccess,
        showWarning,
        showInfo,
        removeToast,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
