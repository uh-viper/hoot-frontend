import { getSessionUser } from '@/lib/auth/validate-session'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import '../../styles/dashboard.css'

export const metadata: Metadata = {
  title: 'Hoot - Vault',
}

export default async function VaultPage() {
  const user = await getSessionUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="dashboard-content">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Vault</h1>
        <p className="dashboard-subtitle">Access and manage your accounts</p>
      </div>
    </div>
  )
}
