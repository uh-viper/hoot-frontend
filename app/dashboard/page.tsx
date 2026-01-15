import { getSessionUser } from '@/lib/auth/validate-session'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import { initializeUserData } from '@/lib/api/user-initialization'
import DashboardWithChart from './components/DashboardWithChart'
import '../styles/dashboard.css'

export const metadata: Metadata = {
  title: 'Hoot - Dashboard',
}

// Force dynamic rendering to always fetch fresh data
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await getSessionUser()

  if (!user) {
    redirect('/login')
  }

  // Get user metadata for full name
  const supabase = await createClient()
  const { data: { user: userWithMetadata } } = await supabase.auth.getUser()
  const fullName = userWithMetadata?.user_metadata?.full_name || ''
  const firstName = fullName ? fullName.split(' ')[0] : ''

  // Ensure user stats are initialized (creates if they don't exist)
  await initializeUserData(user.id)

  return (
    <div className="dashboard-content">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard</h1>
        <p className="dashboard-subtitle">Welcome back, {firstName || user.email?.split('@')[0] || 'User'}</p>
      </div>

      {/* Stats Cards and Chart - Client components that fetch fresh data */}
      <DashboardWithChart />

    </div>
  )
}
