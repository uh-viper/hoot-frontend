"use client";

import { useState } from 'react';
import AccountCard from './AccountCard';

interface Account {
  id: string;
  email: string;
  password: string;
  region?: string | null;
  currency?: string | null;
  created_at?: string;
}

interface VaultClientProps {
  accounts: Account[];
}

export default function VaultClient({ accounts }: VaultClientProps) {
  const [displayCount, setDisplayCount] = useState(6);
  const accountsToShow = accounts.slice(0, displayCount);
  const hasMore = accounts.length > displayCount;

  const loadMore = () => {
    setDisplayCount(prev => prev + 6);
  };

  return (
    <div className="vault-accounts-container">
      <div className="vault-section-box">
        <div className="vault-section-header">
          <h2 className="vault-section-title">Accounts</h2>
          {accounts.length > 0 && (
            <span className="vault-account-count">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</span>
          )}
        </div>
        
        {accounts.length === 0 ? (
          <div className="vault-empty">
            <span className="material-icons">account_circle</span>
            <p>No accounts yet</p>
            <span className="vault-empty-hint">Your business center accounts will appear here after deployment</span>
          </div>
        ) : (
          <>
            <div className="vault-accounts-list">
              {accountsToShow.map((account) => (
                <AccountCard
                  key={account.id}
                  id={account.id}
                  email={account.email}
                  password={account.password}
                  region={account.region}
                  currency={account.currency}
                />
              ))}
            </div>
            
            {hasMore && (
              <div className="vault-load-more">
                <button
                  type="button"
                  className="load-more-btn"
                  onClick={loadMore}
                >
                  View More ({accounts.length - displayCount} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
