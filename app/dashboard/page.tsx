import { getSessionUser } from '@/lib/auth/validate-session'
import { redirect } from 'next/navigation'
import '../styles/dashboard.css'

export default async function DashboardPage() {
  const user = await getSessionUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="dashboard-content">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Welcome Back</h1>
        <p className="dashboard-subtitle">Here's what's happening with your account</p>
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
            <span className="material-icons">payment</span>
          </div>
          <div className="stat-content">
            <p className="stat-label">Credits</p>
            <p className="stat-value">0</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <span className="material-icons">add_circle</span>
          </div>
          <div className="stat-content">
            <p className="stat-label">Created Today</p>
            <p className="stat-value">0</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <span className="material-icons">check_circle</span>
          </div>
          <div className="stat-content">
            <p className="stat-label">Success Rate</p>
            <p className="stat-value">100%</p>
          </div>
        </div>
      </div>

    </div>
  )
}
