"use client";

import { useState } from 'react';
import { useToast } from '../../../contexts/ToastContext';

interface AccountCardProps {
  id: string;
  email: string;
  password: string;
  region?: string | null;
  currency?: string | null;
  onDelete?: () => void;
}

export default function AccountCard({ id, email, password, region, currency, onDelete }: AccountCardProps) {
  const { showSuccess, showError, showInfo, removeToast } = useToast();
  const [isFetchingCode, setIsFetchingCode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const copyToClipboard = async (text: string, type: 'email' | 'password' | 'code'): Promise<boolean> => {
    // Try fallback method first (works better in async contexts)
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      textArea.style.opacity = '0';
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);
      
      // Select the text
      if (navigator.userAgent.match(/ipad|iphone/i)) {
        // iOS requires a different approach
        const range = document.createRange();
        range.selectNodeContents(textArea);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        textArea.setSelectionRange(0, 999999);
      } else {
        textArea.select();
        textArea.setSelectionRange(0, 999999);
      }
      
      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) {
          return true;
        }
      } catch (err) {
        document.body.removeChild(textArea);
        // Continue to try clipboard API
      }
    } catch (err) {
      // Continue to try clipboard API
    }
    
    // Try modern clipboard API as fallback
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
    
    return false;
  };

  const handleFetchCode = async () => {
    if (isFetchingCode) return;

    setIsFetchingCode(true);
    const fetchingToastId = showInfo('Fetching verification code...');

    try {
      const response = await fetch('/api/fetch-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId: id }),
      });

      const data = await response.json();

      // Remove the "Fetching..." toast
      removeToast(fetchingToastId);

      if (response.ok && data.success && data.code) {
        const code = data.code; // Capture code in variable for closure
        // Show toast with copy button (copy happens on user click = proper user gesture)
        showSuccess(
          `Code found: ${code}`,
          {
            label: 'Copy',
            onClick: async () => {
              const copySuccess = await copyToClipboard(code, 'code');
              if (copySuccess) {
                showSuccess('Code copied to clipboard!');
              } else {
                showError('Failed to copy. Please copy manually.');
              }
            }
          }
        );
      } else {
        showError(data.error || 'Failed to fetch verification code');
      }
    } catch (err) {
      console.error('Error fetching code:', err);
      // Remove the "Fetching..." toast on error too
      removeToast(fetchingToastId);
      showError('Failed to fetch verification code. Please try again.');
    } finally {
      setIsFetchingCode(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/accounts/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showSuccess('Account deleted successfully');
        setShowDeleteConfirm(false);
        // Notify parent component to refresh accounts list
        if (onDelete) {
          onDelete();
        }
        // Also dispatch custom event for real-time updates
        window.dispatchEvent(new CustomEvent('accounts-updated'));
      } else {
        showError(data.error || 'Failed to delete account');
      }
    } catch (err) {
      console.error('Error deleting account:', err);
      showError('Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
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
              className="action-btn action-btn-delete"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
              aria-label="Delete Account"
              title="Delete Account"
            >
              <span className="material-icons">delete</span>
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="account-delete-modal-overlay" onClick={() => !isDeleting && setShowDeleteConfirm(false)}>
          <div className="account-delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="account-delete-modal-header">
              <span className="material-icons account-delete-warning-icon">warning</span>
              <h3>Delete Account</h3>
              <button
                type="button"
                className="account-delete-modal-close"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                aria-label="Close"
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="account-delete-modal-content">
              <p>Are you sure you want to delete this account?</p>
              <p className="account-delete-email">{email}</p>
              <p className="account-delete-warning">
                This action cannot be undone. The account will be permanently deleted.
              </p>
            </div>
            <div className="account-delete-modal-footer">
              <button
                type="button"
                className="account-delete-cancel"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="account-delete-confirm"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
