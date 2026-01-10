import { getSessionUser } from '@/lib/auth/validate-session'
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

  // Test account data (will be replaced with actual data from database)
  const testAccounts = [
    {
      id: 'test-1',
      email: 'test@example.com',
      password: 'TestPassword123!',
    },
  ]

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
          </div>
          
          {testAccounts.length === 0 ? (
            <div className="vault-empty">
              <span className="material-icons">account_circle</span>
              <p>No accounts yet</p>
              <span className="vault-empty-hint">Your ad accounts will appear here</span>
            </div>
          ) : (
            <div className="vault-accounts-list">
              {testAccounts.map((account) => (
                <AccountCard
                  key={account.id}
                  id={account.id}
                  email={account.email}
                  password={account.password}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
