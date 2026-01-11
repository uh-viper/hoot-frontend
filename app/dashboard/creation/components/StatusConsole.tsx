"use client";

import { useEffect, useRef } from 'react';
import { useConsole, StatusMessageType } from '../contexts/ConsoleContext';

const getMessageIcon = (type: StatusMessageType) => {
  switch (type) {
    case 'success':
      return '✓';
    case 'error':
      return '✕';
    case 'warning':
      return '⚠';
    default:
      return 'ℹ';
  }
};

const formatTime = (date: Date) => {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export default function StatusConsole() {
  const { messages, isActive } = useConsole();
  const consoleRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  useEffect(() => {
    // Only auto-scroll if user is near the bottom (within 100px)
    if (consoleRef.current && shouldAutoScrollRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [messages]);

  // Track scroll position to determine if we should auto-scroll
  useEffect(() => {
    const consoleElement = consoleRef.current;
    if (!consoleElement) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = consoleElement;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      // If user is within 100px of bottom, enable auto-scroll
      // Otherwise, disable it so they can read older messages
      shouldAutoScrollRef.current = distanceFromBottom < 100;
    };

    consoleElement.addEventListener('scroll', handleScroll);
    return () => {
      consoleElement.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div className="status-console-container">
      <div className="status-console-header">
        <div className="console-title">
          <span className="material-icons">terminal</span>
          <span>Deployment Status</span>
        </div>
        <div className="console-status-indicator">
          <span className={`status-dot ${isActive ? 'active' : 'idle'}`}></span>
          <span>{isActive ? 'Active' : 'Idle'}</span>
        </div>
      </div>
      <div className="status-console" ref={consoleRef}>
        {messages.length === 0 ? (
          <div className="console-empty">
            <span className="material-icons">info</span>
            <p>Waiting for deployment to start...</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`console-message console-message-${msg.type}`}>
              <span className="console-timestamp">[{formatTime(msg.timestamp)}]</span>
              <span className="console-icon">{getMessageIcon(msg.type)}</span>
              <span className="console-text">{msg.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
