"use client";

import { createContext, useContext, useState, ReactNode } from 'react';

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

export function ConsoleProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<StatusMessage[]>([]);
  const [isActive, setIsActive] = useState(false);

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
