"use client";

import { useToast } from '../../../contexts/ToastContext';

interface AccountCardProps {
  id: string;
  email: string;
  password: string;
  region?: string | null;
  currency?: string | null;
}

export default function AccountCard({ id, email, password, region, currency }: AccountCardProps) {
  const { showSuccess } = useToast();

  const copyToClipboard = async (text: string, type: 'email' | 'password') => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess(`${type === 'email' ? 'Email' : 'Password'} copied to clipboard!`);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleFetchCode = () => {
    // TODO: Implement fetch code functionality
    console.log('Fetching code for account:', id);
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
          <div className="account-actions-group">
            <button
              type="button"
              className="action-btn"
              onClick={handleFetchCode}
              aria-label="Fetch Code"
              title="Fetch Code"
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
              <span className="account-value">{email}</span>
              <button
                type="button"
                className="account-copy-btn"
                onClick={() => copyToClipboard(email, 'email')}
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
                onClick={() => copyToClipboard(password, 'password')}
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
