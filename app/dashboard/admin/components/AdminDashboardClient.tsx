'use client'

import { useState, useEffect } from 'react'
import { getFilteredStats } from '@/app/actions/admin-stats'
import { updateUserCredits } from '@/app/actions/admin-credits'
import { useToast } from '@/app/contexts/ToastContext'
import CalendarModal from '../../components/CalendarModal'
import { 
  localDateRangeToUTC, 
  getLocalDateRange, 
  formatDateRange as formatDateRangeUtil,
  formatUTCDateToLocal 
} from '@/lib/utils/date-timezone'
import DomainManagement from './DomainManagement'
import MaintenanceMode from './MaintenanceMode'
import ReferralCodeManagement from './ReferralCodeManagement'
import NotificationManagement from './NotificationManagement'
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

interface ReferralCode {
  id: string
  code: string
  description: string | null
  is_active: boolean
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
  referralCodes: ReferralCode[]
}

export default function AdminDashboardClient({ users, recentPurchases, allPurchases, initialStats, referralCodes }: AdminDashboardClientProps) {
  const { showError, showSuccess } = useToast()
  const [selectedTab, setSelectedTab] = useState<'users' | 'purchases' | 'analytics' | 'management'>('users')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAdmin, setFilterAdmin] = useState<'all' | 'admins' | 'users'>('all')
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null)
  const [filteredStats, setFilteredStats] = useState({
    totalRequested: initialStats.totalRequested,
    totalSuccessful: initialStats.totalSuccessful,
    totalFailures: initialStats.totalFailures,
    revenue: 0, // Will be calculated from allPurchases initially
    totalUsers: users.length,
  })
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [quickDateRange, setQuickDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isReferralDropdownOpen, setIsReferralDropdownOpen] = useState(false)
  const [selectedReferralCode, setSelectedReferralCode] = useState<string | null>(null)
  const [purchasesPage, setPurchasesPage] = useState(1)
  const purchasesPerPage = 5
  const [purchaseSearchTerm, setPurchaseSearchTerm] = useState('')
  const [usersToShow, setUsersToShow] = useState(5)
  const [purchasesToShow, setPurchasesToShow] = useState(5)
  const [editingCredits, setEditingCredits] = useState<{ userId: string; currentCredits: number } | null>(null)
  const [creditAmount, setCreditAmount] = useState('')
  const [isUpdatingCredits, setIsUpdatingCredits] = useState(false)
  const [localUsers, setLocalUsers] = useState<User[]>(users)
  const [deletingUser, setDeletingUser] = useState<{ userId: string; email: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Calculate initial revenue from all purchases
  const initialRevenue = allPurchases
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + (p.amount_paid_cents || 0) / 100, 0)

  // Update stats when date range or referral code filter changes
  useEffect(() => {
    if (dateRange || selectedReferralCode) {
      setIsLoadingStats(true)
      // Convert local time dates to UTC for the server
      const utcDates = dateRange ? localDateRangeToUTC(dateRange.start, dateRange.end) : null
      getFilteredStats(
        utcDates?.start || null, 
        utcDates?.end || null,
        selectedReferralCode || undefined
      )
        .then(stats => {
          if (!stats.error && 'requested' in stats) {
            setFilteredStats({
              totalRequested: stats.requested ?? 0,
              totalSuccessful: stats.successful ?? 0,
              totalFailures: stats.failures ?? 0,
              revenue: stats.revenue ?? 0,
              totalUsers: stats.totalUsers ?? users.length,
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
        totalUsers: users.length,
      })
    }
  }, [dateRange, selectedReferralCode, initialStats, allPurchases, initialRevenue, users.length])

  // Handle quick date range selection
  const handleQuickDateRange = (range: 'all' | 'today' | 'week' | 'month') => {
    setQuickDateRange(range)
    if (range === 'all') {
      setDateRange(null)
      return
    }

    const { start, end } = getLocalDateRange(range)
    setDateRange({ start, end })
  }

  // Update local users when props change
  useEffect(() => {
    setLocalUsers(users)
  }, [users])

  const handleDeleteUser = async () => {
    if (!deletingUser) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/admin/users/${deletingUser.userId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user')
      }

      // Remove user from local state
      setLocalUsers(prevUsers => prevUsers.filter(u => u.user_id !== deletingUser.userId))
      setDeletingUser(null)
      showSuccess(data.message || 'User deleted successfully')
    } catch (err: any) {
      showError(err.message || 'Failed to delete user')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleUpdateCredits = async () => {
    if (!editingCredits || !creditAmount) return

    const amount = parseFloat(creditAmount)
    if (isNaN(amount) || amount === 0) {
      showError('Please enter a valid non-zero amount')
      return
    }

    setIsUpdatingCredits(true)
    try {
      const result = await updateUserCredits(editingCredits.userId, amount)
      
      if (result.success && result.newBalance !== undefined) {
        // Update local users state
        setLocalUsers(prevUsers => 
          prevUsers.map(u => 
            u.user_id === editingCredits.userId 
              ? { ...u, credits: result.newBalance! }
              : u
          )
        )
        setEditingCredits(null)
        setCreditAmount('')
        showSuccess(`Credits ${amount > 0 ? 'added' : 'deducted'} successfully. New balance: ${result.newBalance.toLocaleString()}`)
      } else {
        showError(result.error || 'Failed to update credits')
      }
    } catch (error) {
      console.error('Error updating credits:', error)
      showError('Failed to update credits. Please try again.')
    } finally {
      setIsUpdatingCredits(false)
    }
  }

  const filteredUsers = localUsers.filter(user => {
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
    // Convert UTC date from database to local time for display
    // Format as "Jan 12, 2026" (date only, no time)
    return formatUTCDateToLocal(dateString, 'MMM D, YYYY')
  }

  const formatDateRange = () => {
    if (!dateRange) return 'All Time'
    return formatDateRangeUtil(dateRange.start, dateRange.end)
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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (isDropdownOpen && !target.closest('.admin-date-dropdown')) {
        setIsDropdownOpen(false)
      }
      if (isReferralDropdownOpen && !target.closest('.admin-referral-dropdown')) {
        setIsReferralDropdownOpen(false)
      }
    }

    if (isDropdownOpen || isReferralDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen, isReferralDropdownOpen])

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
        <button
          className={`admin-tab ${selectedTab === 'management' ? 'active' : ''}`}
          onClick={() => setSelectedTab('management')}
        >
          <span className="material-icons">settings</span>
          Management
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
                  <th>Actions</th>
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
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="admin-action-btn"
                          onClick={() => {
                            setEditingCredits({ userId: user.user_id, currentCredits: user.credits })
                            setCreditAmount('')
                          }}
                          title="Adjust Credits"
                        >
                          <span className="material-icons">edit</span>
                        </button>
                        {!user.is_admin && (
                          <button
                            className="admin-action-btn admin-action-btn-delete"
                            onClick={() => setDeletingUser({ userId: user.user_id, email: user.email || 'Unknown' })}
                            title="Delete User"
                          >
                            <span className="material-icons">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
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
          {/* Filter Dropdowns - Top Right */}
          <div className="admin-date-dropdown-wrapper" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {/* Referral Code Dropdown */}
            <div className="admin-referral-dropdown admin-date-dropdown">
              <button
                className="admin-date-dropdown-toggle"
                onClick={() => setIsReferralDropdownOpen(!isReferralDropdownOpen)}
              >
                <span className="material-icons">card_giftcard</span>
                <span>{selectedReferralCode || 'All Users'}</span>
                <span className="material-icons">{isReferralDropdownOpen ? 'expand_less' : 'expand_more'}</span>
              </button>
              {isReferralDropdownOpen && (
                <div className="admin-date-dropdown-menu">
                  <button
                    className={`admin-date-dropdown-item ${!selectedReferralCode ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedReferralCode(null)
                      setIsReferralDropdownOpen(false)
                    }}
                  >
                    <span className="material-icons">group</span>
                    All Users
                  </button>
                  {referralCodes.map((code) => (
                    <button
                      key={code.id}
                      className={`admin-date-dropdown-item ${selectedReferralCode === code.code ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedReferralCode(code.code)
                        setIsReferralDropdownOpen(false)
                      }}
                    >
                      <span className="material-icons">card_giftcard</span>
                      {code.code}
                    </button>
                  ))}
                  {referralCodes.length === 0 && (
                    <div style={{ padding: '0.75rem 1rem', opacity: 0.5, fontSize: '0.875rem' }}>
                      No referral codes created yet
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Date Range Dropdown */}
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
                Total Users
                {isLoadingStats && <span className="stat-loading">...</span>}
              </h3>
              <div className="analytics-content">
                <p className="analytics-value">{filteredStats.totalUsers.toLocaleString()}</p>
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

      {/* Management Tab */}
      {selectedTab === 'management' && (
        <div className="admin-section">
          <div className="management-content">
            <div className="management-section">
              <DomainManagement />
            </div>
            <div className="management-section">
              <ReferralCodeManagement />
            </div>
            <div className="management-section">
              <NotificationManagement />
            </div>
            <div className="management-section">
              <h3 className="management-section-title">
                <span className="material-icons">build</span>
                Maintenance Mode
              </h3>
              <MaintenanceMode />
            </div>
          </div>
        </div>
      )}

      {/* Calendar Modal */}
      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        onSelect={(start, end) => {
          // Calendar returns dates, ensure they're set to start/end of day in local time
          // Create new Date objects with just the date components (no time)
          const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate())
          const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate())
          setDateRange({ start: startDate, end: endDate })
          setQuickDateRange('all')
        }}
        initialStartDate={dateRange?.start}
        initialEndDate={dateRange?.end}
      />

      {/* Credits Adjustment Modal */}
      {editingCredits && (
        <div className="admin-modal-overlay" onClick={() => setEditingCredits(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>Adjust Credits</h2>
              <button 
                className="admin-modal-close"
                onClick={() => setEditingCredits(null)}
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="admin-modal-content">
              <p className="admin-modal-info">
                Current balance: <strong>{editingCredits.currentCredits.toLocaleString()}</strong>
              </p>
              <div className="admin-modal-field">
                <label>
                  Amount (positive to add, negative to deduct)
                </label>
                <input
                  type="number"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  placeholder="e.g., 100 or -50"
                  disabled={isUpdatingCredits}
                />
              </div>
              {creditAmount && !isNaN(parseFloat(creditAmount)) && (
                <p className="admin-modal-preview">
                  New balance: <strong>{(editingCredits.currentCredits + parseFloat(creditAmount)).toLocaleString()}</strong>
                </p>
              )}
            </div>
            <div className="admin-modal-footer">
              <button
                className="admin-modal-cancel"
                onClick={() => setEditingCredits(null)}
                disabled={isUpdatingCredits}
              >
                Cancel
              </button>
              <button
                className="admin-modal-submit"
                onClick={handleUpdateCredits}
                disabled={isUpdatingCredits || !creditAmount || parseFloat(creditAmount) === 0}
              >
                {isUpdatingCredits ? 'Updating...' : 'Update Credits'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deletingUser && (
        <div className="admin-modal-overlay" onClick={() => !isDeleting && setDeletingUser(null)}>
          <div className="admin-modal admin-modal-delete" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header admin-modal-header-delete">
              <span className="material-icons" style={{ fontSize: '2.5rem', color: '#f44336' }}>warning</span>
              <h2>Delete User</h2>
              <button 
                className="admin-modal-close"
                onClick={() => setDeletingUser(null)}
                disabled={isDeleting}
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="admin-modal-content">
              <p className="admin-modal-warning">
                Are you sure you want to delete <strong>{deletingUser.email}</strong>?
              </p>
              <p className="admin-modal-warning-detail">
                This action will permanently delete:
              </p>
              <ul className="admin-modal-delete-list">
                <li>User account and profile</li>
                <li>All credits and purchase history</li>
                <li>All vault items (accounts)</li>
                <li>All job history and stats</li>
                <li>All notifications</li>
              </ul>
              <p className="admin-modal-warning-emphasis">
                This action cannot be undone.
              </p>
            </div>
            <div className="admin-modal-footer">
              <button
                className="admin-modal-cancel"
                onClick={() => setDeletingUser(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="admin-modal-submit admin-modal-submit-delete"
                onClick={handleDeleteUser}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
