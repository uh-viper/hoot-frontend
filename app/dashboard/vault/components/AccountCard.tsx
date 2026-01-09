"use client";

import { useState } from 'react';
import { useToast } from '../../../contexts/ToastContext';

interface AccountCardProps {
  id: string;
  email: string;
  password: string;
}

export default function AccountCard({ id, email, password }: AccountCardProps) {
  const { showSuccess } = useToast();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

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
      <div className="account-info">
        <div className="account-field">
          <label className="account-field-label">Email</label>
          <div className="account-field-value-wrapper">
            <span className="account-field-value">{email}</span>
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

        <div className="account-field">
          <label className="account-field-label">Password</label>
          <div className="account-field-value-wrapper">
            <span className="account-field-value">
              {isPasswordVisible ? password : '•'.repeat(12)}
            </span>
            <button
              type="button"
              className="account-copy-btn"
              onClick={() => copyToClipboard(password, 'password')}
              aria-label="Copy password"
            >
              <span className="material-icons">content_copy</span>
            </button>
            <button
              type="button"
              className="account-copy-btn"
              onClick={() => setIsPasswordVisible(!isPasswordVisible)}
              aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
            >
              <span className="material-icons">
                {isPasswordVisible ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="fetch-code-btn"
        onClick={handleFetchCode}
      >
        <span className="material-icons">code</span>
        Fetch Code
      </button>
    </div>
  );
}
