import { getSessionUser } from '@/lib/auth/validate-session'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import { initializeUserData } from '@/lib/api/user-initialization'
import AccountCard from './components/AccountCard'
import '../../styles/dashboard.css'
import '../../styles/vault.css'

export const metadata: Metadata = {
  title: 'Hoot - Vault',
}

export default async function VaultPage() {
  const user = await getSessionUser()

  if (!user) {
    redirect('/login')
  }

  // Ensure user has all required database rows
  await initializeUserData(user.id)

  // Fetch user accounts from database
  const supabase = await createClient()
  const { data: accounts, error } = await supabase
    .from('user_accounts')
    .select('id, email, password, region, currency, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch accounts:', error)
  }

  const userAccounts = accounts || []

  return (
    <div className="dashboard-content">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Vault</h1>
        <p className="dashboard-subtitle">Access and manage your accounts</p>
      </div>

      <div className="vault-accounts-container">
        <div className="vault-section-box">
          <div className="vault-section-header">
            <h2 className="vault-section-title">Accounts</h2>
            {userAccounts.length > 0 && (
              <span className="vault-account-count">{userAccounts.length} account{userAccounts.length !== 1 ? 's' : ''}</span>
            )}
          </div>
          
          {userAccounts.length === 0 ? (
            <div className="vault-empty">
              <span className="material-icons">account_circle</span>
              <p>No accounts yet</p>
              <span className="vault-empty-hint">Your business center accounts will appear here after deployment</span>
            </div>
          ) : (
            <div className="vault-accounts-list">
              {userAccounts.map((account) => (
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
          )}
        </div>
      </div>
    </div>
  )
}
