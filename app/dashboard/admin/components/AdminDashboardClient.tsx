'use client'

import { useState } from 'react'
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
}

export default function AdminDashboardClient({ users, recentPurchases }: AdminDashboardClientProps) {
  const [selectedTab, setSelectedTab] = useState<'users' | 'purchases'>('users')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAdmin, setFilterAdmin] = useState(false)

  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.discord_username?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesAdminFilter = !filterAdmin || user.is_admin
    
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
          Recent Purchases ({recentPurchases.length})
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
            <label className="admin-filter-checkbox">
              <input
                type="checkbox"
                checked={filterAdmin}
                onChange={(e) => setFilterAdmin(e.target.checked)}
              />
              <span>Show admins only</span>
            </label>
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
                  <th>Admin</th>
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
    </div>
  )
}
