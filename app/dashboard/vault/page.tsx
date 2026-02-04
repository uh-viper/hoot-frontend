import { getSessionUser } from '@/lib/auth/validate-session'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import { initializeUserData } from '@/lib/api/user-initialization'
import VaultClient from './components/VaultClient'
import '../../styles/dashboard.css'
import '../../styles/vault.css'

export const metadata: Metadata = {
  title: 'Hoot - Vault',
}

// Force dynamic rendering to always fetch fresh data
export const dynamic = 'force-dynamic'

export default async function VaultPage() {
  const user = await getSessionUser()

  if (!user) {
    redirect('/login')
  }

  // Ensure user has all required database rows
  await initializeUserData(user.id)

  return (
    <div className="dashboard-content">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Vault</h1>
        <p className="dashboard-subtitle">Access and manage your accounts</p>
      </div>

      <VaultClient />
    </div>
  )
}
