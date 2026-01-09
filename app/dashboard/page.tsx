import { getSessionUser } from '@/lib/auth/validate-session'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import GraphSection from './components/GraphSection'
import '../styles/dashboard.css'

export const metadata: Metadata = {
  title: 'Hoot - Dashboard',
}

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

  // Fetch user stats from database, creating if they don't exist
  let { data: statsData } = await supabase
    .from('user_stats')
    .select('business_centers, requested, successful, failures')
    .eq('user_id', user.id)
    .single()

  // If stats don't exist, create them
  if (!statsData) {
    await supabase
      .from('user_stats')
      .insert({
        user_id: user.id,
        business_centers: 0,
        requested: 0,
        successful: 0,
        failures: 0,
      })
    
    // Fetch again
    const result = await supabase
      .from('user_stats')
      .select('business_centers, requested, successful, failures')
      .eq('user_id', user.id)
      .single()
    
    statsData = result.data
  }

  const stats = {
    businessCenters: statsData?.business_centers ?? 0,
    requested: statsData?.requested ?? 0,
    successful: statsData?.successful ?? 0,
    failures: statsData?.failures ?? 0,
  }

  return (
    <div className="dashboard-content">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard</h1>
        <p className="dashboard-subtitle">Welcome back, {firstName || user.email?.split('@')[0] || 'User'}</p>
      </div>

      {/* Stats Cards */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon">
            <span className="material-icons">account_balance</span>
          </div>
          <div className="stat-content">
            <p className="stat-label">Business Centers</p>
            <p className="stat-value">{stats.businessCenters.toLocaleString()}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <span className="material-icons">pending_actions</span>
          </div>
          <div className="stat-content">
            <p className="stat-label">Requested</p>
            <p className="stat-value">{stats.requested.toLocaleString()}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <span className="material-icons">check_circle</span>
          </div>
          <div className="stat-content">
            <p className="stat-label">Successful</p>
            <p className="stat-value">{stats.successful.toLocaleString()}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <span className="material-icons">error</span>
          </div>
          <div className="stat-content">
            <p className="stat-label">Failures</p>
            <p className="stat-value">{stats.failures.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Graph Section */}
      <GraphSection />

    </div>
  )
}
