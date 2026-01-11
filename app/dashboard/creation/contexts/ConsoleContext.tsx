"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type StatusMessageType = 'info' | 'success' | 'warning' | 'error';

export interface StatusMessage {
  id: string;
  timestamp: Date;
  type: StatusMessageType;
  message: string;
}

interface ConsoleContextType {
  messages: StatusMessage[];
  isActive: boolean;
  addMessage: (type: StatusMessageType, message: string) => void;
  setActive: (active: boolean) => void;
  clearMessages: () => void;
}

const ConsoleContext = createContext<ConsoleContextType | undefined>(undefined);

const STORAGE_KEY = 'hoot_console_logs';
const STORAGE_ACTIVE_KEY = 'hoot_console_active';

// Helper to serialize/deserialize messages for localStorage
const serializeMessages = (messages: StatusMessage[]): string => {
  return JSON.stringify(messages.map(msg => ({
    ...msg,
    timestamp: msg.timestamp.toISOString(),
  })));
};

const deserializeMessages = (data: string): StatusMessage[] => {
  try {
    const parsed = JSON.parse(data);
    return parsed.map((msg: any) => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    }));
  } catch {
    return [];
  }
};

export function ConsoleProvider({ children }: { children: ReactNode }) {
  // Load from localStorage on mount
  const [messages, setMessages] = useState<StatusMessage[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? deserializeMessages(stored) : [];
    } catch {
      return [];
    }
  });

  const [isActive, setIsActive] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(STORAGE_ACTIVE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, serializeMessages(messages));
      } catch (error) {
        console.error('Failed to save console logs to localStorage:', error);
      }
    }
  }, [messages]);

  // Persist active state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_ACTIVE_KEY, isActive.toString());
      } catch (error) {
        console.error('Failed to save console active state to localStorage:', error);
      }
    }
  }, [isActive]);

  const addMessage = (type: StatusMessageType, message: string) => {
    const newMessage: StatusMessage = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      type,
      message,
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const setActive = (active: boolean) => {
    setIsActive(active);
  };

  const clearMessages = () => {
    setMessages([]);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_ACTIVE_KEY);
      } catch (error) {
        console.error('Failed to clear console logs from localStorage:', error);
      }
    }
  };

  return (
    <ConsoleContext.Provider
      value={{
        messages,
        isActive,
        addMessage,
        setActive,
        clearMessages,
      }}
    >
      {children}
    </ConsoleContext.Provider>
  );
}

export function useConsole() {
  const context = useContext(ConsoleContext);
  if (context === undefined) {
    throw new Error('useConsole must be used within a ConsoleProvider');
  }
  return context;
}
