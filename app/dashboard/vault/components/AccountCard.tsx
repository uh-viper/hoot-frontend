"use client";

import { useState } from 'react';
import { useToast } from '../../../contexts/ToastContext';

interface AccountCardProps {
  id: string;
  email: string;
  password: string;
  region?: string | null;
  currency?: string | null;
}

export default function AccountCard({ id, email, password, region, currency }: AccountCardProps) {
  const { showSuccess, showError, showInfo } = useToast();
  const [isFetchingCode, setIsFetchingCode] = useState(false);

  const copyToClipboard = async (text: string, type: 'email' | 'password' | 'code'): Promise<boolean> => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      
      // Fallback for older browsers or when clipboard API is not available
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
      } catch (err) {
        document.body.removeChild(textArea);
        throw err;
      }
    } catch (err) {
      console.error('Failed to copy:', err);
      return false;
    }
  };

  const handleFetchCode = async () => {
    if (isFetchingCode) return;

    setIsFetchingCode(true);
    showInfo('Fetching verification code...');

    try {
      const response = await fetch('/api/fetch-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId: id }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.code) {
        // Try to copy code to clipboard
        const copySuccess = await copyToClipboard(data.code, 'code');
        
        if (copySuccess) {
          showSuccess(`Verification code fetched and copied: ${data.code}`);
        } else {
          // Show code even if copy failed
          showSuccess(`Verification code fetched: ${data.code} (Copy failed - please copy manually)`);
        }
      } else {
        showError(data.error || 'Failed to fetch verification code');
      }
    } catch (err) {
      console.error('Error fetching code:', err);
      showError('Failed to fetch verification code. Please try again.');
    } finally {
      setIsFetchingCode(false);
    }
  };

  return (
    <div className="account-card">
      <div className="account-card-header">
        <div className="account-info-section">
          {region && (
            <div className="account-info-item">
              <span className="material-icons">location_on</span>
              <span className="account-info-text">{region}</span>
            </div>
          )}
          {currency && (
            <div className="account-info-item">
              <span className="material-icons">attach_money</span>
              <span className="account-info-text">{currency}</span>
            </div>
          )}
        </div>
        <div className="account-actions-section">
          <span className="account-separator">|</span>
          <div className="account-actions-group">
            <button
              type="button"
              className="action-btn"
              onClick={handleFetchCode}
              disabled={isFetchingCode}
              aria-label="Fetch Code"
              title={isFetchingCode ? "Fetching code..." : "Fetch Code"}
            >
              <span className="material-icons">mail</span>
            </button>
            <button
              type="button"
              className="action-btn coming-soon"
              disabled
              aria-label="Coming Soon"
              title="Coming Soon"
            >
              <span className="material-icons">schedule</span>
            </button>
            <button
              type="button"
              className="action-btn coming-soon"
              disabled
              aria-label="Coming Soon"
              title="Coming Soon"
            >
              <span className="material-icons">schedule</span>
            </button>
            <button
              type="button"
              className="action-btn coming-soon"
              disabled
              aria-label="Coming Soon"
              title="Coming Soon"
            >
              <span className="material-icons">schedule</span>
            </button>
            <button
              type="button"
              className="action-btn coming-soon"
              disabled
              aria-label="Coming Soon"
              title="Coming Soon"
            >
              <span className="material-icons">schedule</span>
            </button>
          </div>
        </div>
      </div>
      
      <div className="account-card-body">
        <div className="account-credential-row">
          <div className="account-credential-item">
            <div className="credential-label-wrapper">
              <span className="material-icons credential-icon">email</span>
              <label className="account-label">Email</label>
            </div>
            <div className="account-value-group">
              <span className="account-value" title={email}>{email}</span>
              <button
                type="button"
                className="account-copy-btn"
                onClick={async () => {
                  const success = await copyToClipboard(email, 'email');
                  if (success) {
                    showSuccess('Email copied to clipboard!');
                  } else {
                    showError('Failed to copy email. Please copy manually.');
                  }
                }}
                aria-label="Copy email"
              >
                <span className="material-icons">content_copy</span>
              </button>
            </div>
          </div>

          <div className="account-credential-item">
            <div className="credential-label-wrapper">
              <span className="material-icons credential-icon">lock</span>
              <label className="account-label">Password</label>
            </div>
            <div className="account-value-group">
              <span className="account-value">{password}</span>
              <button
                type="button"
                className="account-copy-btn"
                onClick={async () => {
                  const success = await copyToClipboard(password, 'password');
                  if (success) {
                    showSuccess('Password copied to clipboard!');
                  } else {
                    showError('Failed to copy password. Please copy manually.');
                  }
                }}
                aria-label="Copy password"
              >
                <span className="material-icons">content_copy</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
