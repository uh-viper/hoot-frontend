import { getSessionUser } from '@/lib/auth/validate-session'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GraphSection from './components/GraphSection'
import '../styles/dashboard.css'

export default async function DashboardPage() {
  const user = await getSessionUser()

  if (!user) {
    redirect('/login')
  }

  // Get user metadata for full name
  const supabase = await createClient()
  const { data: { user: userWithMetadata } } = await supabase.auth.getUser()
  const fullName = userWithMetadata?.user_metadata?.full_name || ''

  return (
    <div className="dashboard-content">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard</h1>
        <p className="dashboard-subtitle">Welcome back, {fullName || user.email?.split('@')[0] || 'User'}</p>
      </div>

      {/* Stats Cards */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon">
            <span className="material-icons">account_balance</span>
          </div>
          <div className="stat-content">
            <p className="stat-label">Business Centers</p>
            <p className="stat-value">0</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <span className="material-icons">pending_actions</span>
          </div>
          <div className="stat-content">
            <p className="stat-label">Requested</p>
            <p className="stat-value">0</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <span className="material-icons">check_circle</span>
          </div>
          <div className="stat-content">
            <p className="stat-label">Successful</p>
            <p className="stat-value">0</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <span className="material-icons">error</span>
          </div>
          <div className="stat-content">
            <p className="stat-label">Failures</p>
            <p className="stat-value">0</p>
          </div>
        </div>
      </div>

      {/* Graph Section */}
      <GraphSection />

    </div>
  )
}
