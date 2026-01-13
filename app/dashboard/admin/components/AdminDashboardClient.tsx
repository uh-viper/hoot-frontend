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
  amount_paid_cents: number | null
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
  const [filteredStats, setFilteredStats] = useState({
    totalRequested: initialStats.totalRequested,
    totalSuccessful: initialStats.totalSuccessful,
    totalFailures: initialStats.totalFailures,
    revenue: 0, // Will be calculated from allPurchases initially
  })
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [quickDateRange, setQuickDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [purchasesPage, setPurchasesPage] = useState(1)
  const purchasesPerPage = 5
  const [purchaseSearchTerm, setPurchaseSearchTerm] = useState('')
  const [usersToShow, setUsersToShow] = useState(5)
  const [purchasesToShow, setPurchasesToShow] = useState(5)

  // Calculate initial revenue from all purchases
  const initialRevenue = allPurchases
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + (p.amount_paid_cents || 0) / 100, 0)

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
              revenue: stats.revenue ?? 0,
            })
          }
          setIsLoadingStats(false)
        })
        .catch(() => setIsLoadingStats(false))
    } else {
      setFilteredStats({
        totalRequested: initialStats.totalRequested,
        totalSuccessful: initialStats.totalSuccessful,
        totalFailures: initialStats.totalFailures,
        revenue: initialRevenue,
      })
    }
  }, [dateRange, initialStats, allPurchases, initialRevenue])

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

  // Filter purchases based on search term
  const filteredPurchases = allPurchases.filter(purchase => {
    if (!purchaseSearchTerm) return true
    
    const searchLower = purchaseSearchTerm.toLowerCase()
    return (
      purchase.id.toLowerCase().includes(searchLower) ||
      purchase.user_id.toLowerCase().includes(searchLower) ||
      purchase.credits.toString().includes(searchLower) ||
      purchase.status.toLowerCase().includes(searchLower) ||
      (purchase.amount_paid_cents && (purchase.amount_paid_cents / 100).toFixed(2).includes(searchLower))
    )
  })

  // Reset to initial view when search term changes
  useEffect(() => {
    setPurchasesPage(1)
    setPurchasesToShow(5)
  }, [purchaseSearchTerm])

  // Reset users view when search or filter changes
  useEffect(() => {
    setUsersToShow(5)
  }, [searchTerm, filterAdmin])

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

  const handleDateRangeSelect = (range: 'all' | 'today' | 'week' | 'month' | 'custom') => {
    if (range === 'custom') {
      setIsCalendarOpen(true)
      setIsDropdownOpen(false)
    } else {
      handleQuickDateRange(range as 'all' | 'today' | 'week' | 'month')
      setIsDropdownOpen(false)
    }
  }

  const getDateRangeLabel = () => {
    if (dateRange) {
      return formatDateRange()
    }
    return 'All Time'
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (isDropdownOpen && !target.closest('.admin-date-dropdown')) {
        setIsDropdownOpen(false)
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  return (
    <div className="admin-dashboard-content">

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
          Total Purchases ({allPurchases.length})
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
                {filteredUsers.slice(0, usersToShow).map((user) => (
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
            {filteredUsers.length > usersToShow && (
              <div className="admin-view-more">
                <button
                  className="admin-view-more-btn"
                  onClick={() => setUsersToShow(prev => prev + 5)}
                >
                  View More ({filteredUsers.length - usersToShow} remaining)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Purchases Tab */}
      {selectedTab === 'purchases' && (
        <div className="admin-section">
          <div className="admin-filters">
            <input
              type="text"
              placeholder="Search purchases by ID, user ID, credits, amount, or status..."
              value={purchaseSearchTerm}
              onChange={(e) => setPurchaseSearchTerm(e.target.value)}
              className="admin-search-input"
            />
          </div>

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
                {filteredPurchases.slice(0, purchasesToShow).map((purchase) => (
                  <tr key={purchase.id}>
                    <td className="admin-id-cell">{purchase.id.slice(0, 8)}...</td>
                    <td className="admin-id-cell">{purchase.user_id.slice(0, 8)}...</td>
                    <td>{purchase.credits}</td>
                    <td>${purchase.amount_paid_cents ? (purchase.amount_paid_cents / 100).toFixed(2) : '0.00'}</td>
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
            {filteredPurchases.length === 0 && (
              <div className="admin-empty">
                <span className="material-icons">receipt_long</span>
                <p>{purchaseSearchTerm ? 'No purchases found' : 'No purchases yet'}</p>
              </div>
            )}
            {filteredPurchases.length > purchasesToShow && (
              <div className="admin-view-more">
                <button
                  className="admin-view-more-btn"
                  onClick={() => setPurchasesToShow(prev => prev + 5)}
                >
                  View More ({filteredPurchases.length - purchasesToShow} remaining)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {selectedTab === 'analytics' && (
        <div className="admin-section">
          {/* Date Range Dropdown - Top Right */}
          <div className="admin-date-dropdown-wrapper">
            <div className="admin-date-dropdown">
              <button
                className="admin-date-dropdown-toggle"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <span className="material-icons">calendar_today</span>
                <span>{getDateRangeLabel()}</span>
                <span className="material-icons">{isDropdownOpen ? 'expand_less' : 'expand_more'}</span>
              </button>
              {isDropdownOpen && (
                <div className="admin-date-dropdown-menu">
                  <button
                    className={`admin-date-dropdown-item ${quickDateRange === 'all' ? 'active' : ''}`}
                    onClick={() => handleDateRangeSelect('all')}
                  >
                    <span className="material-icons">event</span>
                    All Time
                  </button>
                  <button
                    className={`admin-date-dropdown-item ${quickDateRange === 'today' ? 'active' : ''}`}
                    onClick={() => handleDateRangeSelect('today')}
                  >
                    <span className="material-icons">today</span>
                    Today
                  </button>
                  <button
                    className={`admin-date-dropdown-item ${quickDateRange === 'week' ? 'active' : ''}`}
                    onClick={() => handleDateRangeSelect('week')}
                  >
                    <span className="material-icons">date_range</span>
                    This Week
                  </button>
                  <button
                    className={`admin-date-dropdown-item ${quickDateRange === 'month' ? 'active' : ''}`}
                    onClick={() => handleDateRangeSelect('month')}
                  >
                    <span className="material-icons">calendar_month</span>
                    This Month
                  </button>
                  <button
                    className="admin-date-dropdown-item"
                    onClick={() => handleDateRangeSelect('custom')}
                  >
                    <span className="material-icons">tune</span>
                    Custom Range
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="admin-analytics">
            {/* First Row: Total Users, Revenue, Success Rate */}
            <div className="analytics-card">
              <h3 className="analytics-title">
                <span className="material-icons">people</span>
                Users
              </h3>
              <div className="analytics-content">
                <p className="analytics-value">{users.length.toLocaleString()}</p>
              </div>
            </div>

            <div className="analytics-card">
              <h3 className="analytics-title">
                <span className="material-icons">payments</span>
                Revenue
                {isLoadingStats && <span className="stat-loading">...</span>}
              </h3>
              <div className="analytics-content">
                <p className="analytics-value">
                  ${filteredStats.revenue.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="analytics-card">
              <h3 className="analytics-title">
                <span className="material-icons">insights</span>
                Success Rate
                {isLoadingStats && <span className="stat-loading">...</span>}
              </h3>
              <div className="analytics-content">
                <p className="analytics-value">
                  {filteredStats.totalRequested > 0
                    ? ((filteredStats.totalSuccessful / filteredStats.totalRequested) * 100).toFixed(1)
                    : 0}%
                </p>
              </div>
            </div>

            {/* Second Row: Requested, Successful, Failures */}
            <div className="analytics-card">
              <h3 className="analytics-title">
                <span className="material-icons">pending_actions</span>
                Requested
                {isLoadingStats && <span className="stat-loading">...</span>}
              </h3>
              <div className="analytics-content">
                <p className="analytics-value">{filteredStats.totalRequested.toLocaleString()}</p>
              </div>
            </div>

            <div className="analytics-card">
              <h3 className="analytics-title">
                <span className="material-icons">check_circle</span>
                Successful
                {isLoadingStats && <span className="stat-loading">...</span>}
              </h3>
              <div className="analytics-content">
                <p className="analytics-value">{filteredStats.totalSuccessful.toLocaleString()}</p>
              </div>
            </div>

            <div className="analytics-card">
              <h3 className="analytics-title">
                <span className="material-icons">error</span>
                Failures
                {isLoadingStats && <span className="stat-loading">...</span>}
              </h3>
              <div className="analytics-content">
                <p className="analytics-value">{filteredStats.totalFailures.toLocaleString()}</p>
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
