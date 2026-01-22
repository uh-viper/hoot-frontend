"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
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
  initialAccounts: Account[];
}

export default function VaultClient({ initialAccounts }: VaultClientProps) {
  const pathname = usePathname();
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [isLoading, setIsLoading] = useState(false);
  const [displayCount, setDisplayCount] = useState(6);
  const accountsToShow = accounts.slice(0, displayCount);
  const hasMore = accounts.length > displayCount;

  // Fetch accounts function
  const fetchAccounts = async () => {
    setIsLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setIsLoading(false);
      return;
    }

    const { data: userAccounts, error } = await supabase
      .from('user_accounts')
      .select('id, email, password, region, currency, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching accounts:', error);
      setIsLoading(false);
      return;
    }

    setAccounts(userAccounts || []);
    setIsLoading(false);
  };

  useEffect(() => {
    // Fetch fresh accounts when component mounts or pathname changes
    fetchAccounts();

    // Set up real-time subscription
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      channel = supabase
        .channel('vault-accounts-updates')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'user_accounts',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            // When any account changes, refetch accounts
            fetchAccounts();
          }
        )
        .subscribe();

      return channel;
    };

    setupRealtime().then(ch => {
      channel = ch;
    });

    // Listen for custom event when job completes
    const handleAccountsUpdate = () => {
      fetchAccounts();
    };
    
    // Listen for when page becomes visible (user switches back to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchAccounts();
      }
    };
    
    window.addEventListener('accounts-updated', handleAccountsUpdate);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
      window.removeEventListener('accounts-updated', handleAccountsUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pathname]); // Re-run when pathname changes (user navigates to vault)

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
            <span className="material-icons">account_box</span>
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
                  onDelete={fetchAccounts}
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
