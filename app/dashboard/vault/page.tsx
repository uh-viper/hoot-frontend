import { getSessionUser } from '@/lib/auth/validate-session'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import { initializeUserData } from '@/lib/api/user-initialization'
import VaultClient from './components/VaultClient'
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

      <VaultClient accounts={userAccounts} />
    </div>
  )
}
