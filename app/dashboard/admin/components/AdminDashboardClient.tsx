'use client'

import { useState, useEffect } from 'react'
import { getFilteredStats } from '@/app/actions/admin-stats'
import CalendarModal from '../../components/CalendarModal'
import './admin-client.css'

interface User {
  id: string
  user_id: string
  email: string | null
  full_name: string | null
  discord_username: string | null
  is_admin: boolean
  created_at: string
  updated_at: string
  stats: {
    requested: number
    successful: number
    failures: number
  }
  credits: number
}

interface Purchase {
  id: string
  user_id: string
  credits: number
  amount: number | null
  status: string
  created_at: string
}

interface AdminDashboardClientProps {
  users: User[]
  recentPurchases: Purchase[]
  allPurchases: Purchase[]
  initialStats: {
    totalRequested: number
    totalSuccessful: number
    totalFailures: number
  }
}

export default function AdminDashboardClient({ users, recentPurchases, allPurchases, initialStats }: AdminDashboardClientProps) {
  const [selectedTab, setSelectedTab] = useState<'users' | 'purchases' | 'analytics'>('users')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAdmin, setFilterAdmin] = useState<'all' | 'admins' | 'users'>('all')
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null)
  const [filteredStats, setFilteredStats] = useState(initialStats)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [quickDateRange, setQuickDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all')

  // Update stats when date range changes
  useEffect(() => {
    if (dateRange) {
      setIsLoadingStats(true)
      getFilteredStats(dateRange.start, dateRange.end)
        .then(stats => {
          if (!stats.error && 'requested' in stats) {
            setFilteredStats({
              totalRequested: stats.requested ?? 0,
              totalSuccessful: stats.successful ?? 0,
              totalFailures: stats.failures ?? 0,
            })
          }
          setIsLoadingStats(false)
        })
        .catch(() => setIsLoadingStats(false))
    } else {
      setFilteredStats(initialStats)
    }
  }, [dateRange, initialStats])

  // Handle quick date range selection
  const handleQuickDateRange = (range: 'all' | 'today' | 'week' | 'month') => {
    setQuickDateRange(range)
    if (range === 'all') {
      setDateRange(null)
      return
    }

    const today = new Date()
    const start = new Date(today)

    switch (range) {
      case 'today':
        start.setUTCHours(0, 0, 0, 0)
        setDateRange({ start, end: today })
        break
      case 'week':
        start.setDate(today.getDate() - 7)
        start.setUTCHours(0, 0, 0, 0)
        setDateRange({ start, end: today })
        break
      case 'month':
        start.setDate(1)
        start.setUTCHours(0, 0, 0, 0)
        setDateRange({ start, end: today })
        break
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.discord_username?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesAdminFilter = 
      filterAdmin === 'all' || 
      (filterAdmin === 'admins' && user.is_admin) ||
      (filterAdmin === 'users' && !user.is_admin)
    
    return matchesSearch && matchesAdminFilter
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDateRange = () => {
    if (!dateRange) return 'All Time'
    const startStr = dateRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const endStr = dateRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    return `${startStr} - ${endStr}`
  }

  return (
    <div className="admin-dashboard-content">
      {/* Date Range Selector */}
      <div className="admin-date-selector">
        <div className="admin-date-quick-filters">
          <button
            className={`admin-quick-date-btn ${quickDateRange === 'all' ? 'active' : ''}`}
            onClick={() => handleQuickDateRange('all')}
          >
            All Time
          </button>
          <button
            className={`admin-quick-date-btn ${quickDateRange === 'today' ? 'active' : ''}`}
            onClick={() => handleQuickDateRange('today')}
          >
            Today
          </button>
          <button
            className={`admin-quick-date-btn ${quickDateRange === 'week' ? 'active' : ''}`}
            onClick={() => handleQuickDateRange('week')}
          >
            Last 7 Days
          </button>
          <button
            className={`admin-quick-date-btn ${quickDateRange === 'month' ? 'active' : ''}`}
            onClick={() => handleQuickDateRange('month')}
          >
            This Month
          </button>
          <button
            className="admin-custom-date-btn"
            onClick={() => setIsCalendarOpen(true)}
          >
            <span className="material-icons">calendar_today</span>
            Custom Range
          </button>
        </div>
        {dateRange && (
          <div className="admin-date-range-display">
            <span className="material-icons">event</span>
            {formatDateRange()}
            <button
              className="admin-clear-date-btn"
              onClick={() => {
                setDateRange(null)
                setQuickDateRange('all')
              }}
            >
              <span className="material-icons">close</span>
            </button>
          </div>
        )}
      </div>

      {/* Filtered Stats Cards - Only Requested, Successful, Failures update with date */}
      <div className="dashboard-stats admin-filtered-stats">
        <div className="stat-card">
          <div className="stat-icon">
            <span className="material-icons">pending_actions</span>
          </div>
          <div className="stat-content">
            <p className="stat-label">
              {dateRange ? 'Filtered' : 'Total'} Requested
              {isLoadingStats && <span className="stat-loading">...</span>}
            </p>
            <p className="stat-value">{filteredStats.totalRequested.toLocaleString()}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <span className="material-icons">check_circle</span>
          </div>
          <div className="stat-content">
            <p className="stat-label">
              {dateRange ? 'Filtered' : 'Total'} Successful
              {isLoadingStats && <span className="stat-loading">...</span>}
            </p>
            <p className="stat-value">{filteredStats.totalSuccessful.toLocaleString()}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <span className="material-icons">error</span>
          </div>
          <div className="stat-content">
            <p className="stat-label">
              {dateRange ? 'Filtered' : 'Total'} Failures
              {isLoadingStats && <span className="stat-loading">...</span>}
            </p>
            <p className="stat-value">{filteredStats.totalFailures.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${selectedTab === 'users' ? 'active' : ''}`}
          onClick={() => setSelectedTab('users')}
        >
          <span className="material-icons">people</span>
          Users ({filteredUsers.length})
        </button>
        <button
          className={`admin-tab ${selectedTab === 'purchases' ? 'active' : ''}`}
          onClick={() => setSelectedTab('purchases')}
        >
          <span className="material-icons">receipt</span>
          Recent Purchases ({recentPurchases.length})
        </button>
        <button
          className={`admin-tab ${selectedTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setSelectedTab('analytics')}
        >
          <span className="material-icons">insights</span>
          Analytics
        </button>
      </div>

      {/* Users Tab */}
      {selectedTab === 'users' && (
        <div className="admin-section">
          <div className="admin-filters">
            <input
              type="text"
              placeholder="Search users by email, name, or discord..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="admin-search-input"
            />
            <div className="admin-filter-toggle">
              <button
                className={`admin-filter-option ${filterAdmin === 'all' ? 'active' : ''}`}
                onClick={() => setFilterAdmin('all')}
              >
                All
              </button>
              <button
                className={`admin-filter-option ${filterAdmin === 'admins' ? 'active' : ''}`}
                onClick={() => setFilterAdmin('admins')}
              >
                <span className="material-icons">admin_panel_settings</span>
                Admins
              </button>
              <button
                className={`admin-filter-option ${filterAdmin === 'users' ? 'active' : ''}`}
                onClick={() => setFilterAdmin('users')}
              >
                <span className="material-icons">person</span>
                Users
              </button>
            </div>
          </div>

          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Discord</th>
                  <th>Credits</th>
                  <th>Requested</th>
                  <th>Successful</th>
                  <th>Failures</th>
                  <th>Role</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.email || 'N/A'}</td>
                    <td>{user.full_name || 'N/A'}</td>
                    <td>{user.discord_username || 'N/A'}</td>
                    <td>{user.credits.toLocaleString()}</td>
                    <td>{user.stats.requested.toLocaleString()}</td>
                    <td>{user.stats.successful.toLocaleString()}</td>
                    <td>{user.stats.failures.toLocaleString()}</td>
                    <td>
                      {user.is_admin ? (
                        <span className="admin-badge">Admin</span>
                      ) : (
                        <span className="user-badge">User</span>
                      )}
                    </td>
                    <td>{formatDate(user.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="admin-empty">
                <span className="material-icons">search_off</span>
                <p>No users found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Purchases Tab */}
      {selectedTab === 'purchases' && (
        <div className="admin-section">
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Purchase ID</th>
                  <th>User ID</th>
                  <th>Credits</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentPurchases.map((purchase) => (
                  <tr key={purchase.id}>
                    <td className="admin-id-cell">{purchase.id.slice(0, 8)}...</td>
                    <td className="admin-id-cell">{purchase.user_id.slice(0, 8)}...</td>
                    <td>{purchase.credits}</td>
                    <td>${purchase.amount ? (purchase.amount / 100).toFixed(2) : '0.00'}</td>
                    <td>
                      <span className={`status-badge status-${purchase.status}`}>
                        {purchase.status}
                      </span>
                    </td>
                    <td>{formatDate(purchase.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentPurchases.length === 0 && (
              <div className="admin-empty">
                <span className="material-icons">receipt_long</span>
                <p>No purchases yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {selectedTab === 'analytics' && (
        <div className="admin-section">
          <div className="admin-analytics">
            <div className="analytics-card">
              <h3 className="analytics-title">
                <span className="material-icons">people</span>
                Total Users
              </h3>
              <div className="analytics-content">
                <p className="analytics-value">{users.length.toLocaleString()}</p>
                <p className="analytics-label">Total registered users</p>
                <div className="analytics-breakdown">
                  <span>{users.filter(u => u.is_admin).length} admins</span>
                  <span>{users.filter(u => !u.is_admin).length} regular users</span>
                </div>
              </div>
            </div>

            <div className="analytics-card">
              <h3 className="analytics-title">
                <span className="material-icons">payments</span>
                Total Revenue
              </h3>
              <div className="analytics-content">
                <p className="analytics-value">
                  ${allPurchases
                    .filter(p => p.status === 'completed')
                    .reduce((sum, p) => sum + (p.amount || 0) / 100, 0)
                    .toFixed(2)}
                </p>
                <p className="analytics-label">All-time revenue from completed purchases</p>
              </div>
            </div>

            <div className="analytics-card">
              <h3 className="analytics-title">
                <span className="material-icons">insights</span>
                Success Rate
              </h3>
              <div className="analytics-content">
                <p className="analytics-value">
                  {users.reduce((sum, u) => sum + u.stats.requested, 0) > 0
                    ? ((users.reduce((sum, u) => sum + u.stats.successful, 0) /
                        users.reduce((sum, u) => sum + u.stats.requested, 0)) * 100).toFixed(1)
                    : 0}%
                </p>
                <p className="analytics-label">Average success rate across all users</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Modal */}
      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        onSelect={(start, end) => {
          setDateRange({ start, end })
          setQuickDateRange('all')
        }}
        initialStartDate={dateRange?.start}
        initialEndDate={dateRange?.end}
      />
    </div>
  )
}
