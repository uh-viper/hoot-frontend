'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/app/contexts/ToastContext'

interface Notification {
  id: string
  title: string
  message: string
  type: 'announcement' | 'welcome' | 'system' | 'promotion'
  is_active: boolean
  is_welcome_notification: boolean
  sent_count: number
  read_count: number
  created_at: string
}

export default function NotificationManagement() {
  const { showSuccess, showError, showInfo } = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isSending, setIsSending] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isTogglingWelcome, setIsTogglingWelcome] = useState<string | null>(null)
  
  // Form state
  const [newTitle, setNewTitle] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [newType, setNewType] = useState<'announcement' | 'welcome' | 'system' | 'promotion'>('announcement')
  const [sendToAll, setSendToAll] = useState(false)
  const [setAsWelcome, setSetAsWelcome] = useState(false)
  
  const [deleteModal, setDeleteModal] = useState<{ id: string; title: string } | null>(null)

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/admin/notifications')
      if (!response.ok) throw new Error('Failed to fetch notifications')
      const data = await response.json()
      setNotifications(data.notifications || [])
    } catch (err) {
      console.error('Error fetching notifications:', err)
      showError('Failed to load notifications')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !newMessage.trim()) {
      showError('Title and message are required')
      return
    }

    setIsCreating(true)
    showInfo('Creating notification...')

    try {
      const response = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          message: newMessage.trim(),
          type: newType,
          send_to_all: sendToAll,
          is_welcome_notification: setAsWelcome,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create notification')
      }

      showSuccess(data.message || 'Notification created successfully')
      setNewTitle('')
      setNewMessage('')
      setNewType('announcement')
      setSendToAll(false)
      setSetAsWelcome(false)
      fetchNotifications()
    } catch (err: any) {
      showError(err.message || 'Failed to create notification')
    } finally {
      setIsCreating(false)
    }
  }

  const handleSendToAll = async (notificationId: string) => {
    setIsSending(notificationId)
    try {
      const response = await fetch(`/api/admin/notifications/${notificationId}`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send notification')
      }

      showSuccess(data.message || 'Notification sent successfully')
      fetchNotifications()
    } catch (err: any) {
      showError(err.message || 'Failed to send notification')
    } finally {
      setIsSending(null)
    }
  }

  const handleToggleWelcome = async (notificationId: string, currentValue: boolean) => {
    setIsTogglingWelcome(notificationId)
    try {
      const response = await fetch(`/api/admin/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_welcome_notification: !currentValue }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update notification')
      }

      showSuccess(!currentValue ? 'Set as welcome notification' : 'Removed as welcome notification')
      fetchNotifications()
    } catch (err: any) {
      showError(err.message || 'Failed to update notification')
    } finally {
      setIsTogglingWelcome(null)
    }
  }

  const handleDeleteClick = (id: string, title: string) => {
    setDeleteModal({ id, title })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteModal) return

    const { id, title } = deleteModal
    setDeleteModal(null)
    setIsDeleting(id)
    showInfo('Deleting notification...')

    try {
      const response = await fetch(`/api/admin/notifications/${id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete notification')
      }

      showSuccess('Notification deleted successfully')
      fetchNotifications()
    } catch (err: any) {
      showError(err.message || 'Failed to delete notification')
    } finally {
      setIsDeleting(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'announcement': return '#2196f3'
      case 'welcome': return '#4caf50'
      case 'system': return '#ff9800'
      case 'promotion': return '#e91e63'
      default: return '#9e9e9e'
    }
  }

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem', width: '40px', height: '40px' }}></div>
        <p>Loading notifications...</p>
      </div>
    )
  }

  const welcomeNotification = notifications.find(n => n.is_welcome_notification)

  return (
    <div className="notification-management">
      <h3 className="management-section-title">
        <span className="material-icons">notifications</span>
        Notifications ({notifications.length})
      </h3>

      {/* Welcome Notification Status */}
      <div style={{ 
        marginBottom: '1.5rem', 
        padding: '1rem', 
        background: 'rgba(76, 175, 80, 0.1)', 
        borderRadius: '8px',
        border: '1px solid rgba(76, 175, 80, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span className="material-icons" style={{ color: '#4caf50' }}>waving_hand</span>
          <strong>Welcome Notification</strong>
        </div>
        <p style={{ opacity: 0.8, fontSize: '0.875rem', margin: 0 }}>
          {welcomeNotification 
            ? `"${welcomeNotification.title}" will be sent to new users on signup.`
            : 'No welcome notification set. Create one and mark it as welcome notification.'}
        </p>
      </div>

      {/* Create Form */}
      <div className="domain-add-form">
        <form onSubmit={handleCreate}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: '2', minWidth: '200px' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                  Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Notification title"
                  disabled={isCreating}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    fontSize: '1rem',
                  }}
                />
              </div>
              <div style={{ flex: '1', minWidth: '150px' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                  Type
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  disabled={isCreating}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    color: '#fff',
                    fontSize: '1rem',
                  }}
                >
                  <option value="announcement">Announcement</option>
                  <option value="welcome">Welcome</option>
                  <option value="system">System</option>
                  <option value="promotion">Promotion</option>
                </select>
              </div>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                Message
              </label>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Notification message..."
                disabled={isCreating}
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: '#fff',
                  fontSize: '1rem',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={sendToAll}
                  onChange={(e) => setSendToAll(e.target.checked)}
                  disabled={isCreating}
                />
                <span>Send to all existing users</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={setAsWelcome}
                  onChange={(e) => setSetAsWelcome(e.target.checked)}
                  disabled={isCreating}
                />
                <span>Set as welcome notification (sent to new signups)</span>
              </label>
            </div>

            <div>
              <button
                type="submit"
                disabled={isCreating || !newTitle.trim() || !newMessage.trim()}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: isCreating ? 'rgba(212, 175, 55, 0.5)' : '#d4af37',
                  color: '#000',
                  fontWeight: 600,
                  cursor: isCreating ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                }}
              >
                {isCreating ? 'Creating...' : 'Create Notification'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Notifications List */}
      <div className="domain-list" style={{ marginTop: '2rem' }}>
        {notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.6 }}>
            <span className="material-icons" style={{ fontSize: '3rem', marginBottom: '1rem' }}>
              notifications_off
            </span>
            <p>No notifications created yet</p>
          </div>
        ) : (
          <div className="admin-table-container domain-list-scrollable">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Sent</th>
                  <th>Read</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((notification) => (
                  <tr key={notification.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <strong>{notification.title}</strong>
                        {notification.is_welcome_notification && (
                          <span 
                            title="Welcome notification (sent to new users)"
                            style={{ 
                              background: 'rgba(76, 175, 80, 0.2)', 
                              color: '#4caf50',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                            }}
                          >
                            WELCOME
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.25rem' }}>
                        {notification.message.length > 60 
                          ? notification.message.substring(0, 60) + '...' 
                          : notification.message}
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          backgroundColor: `${getTypeColor(notification.type)}20`,
                          color: getTypeColor(notification.type),
                          textTransform: 'capitalize',
                        }}
                      >
                        {notification.type}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }}>{notification.sent_count}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 500 }}>{notification.read_count}</span>
                    </td>
                    <td>{formatDate(notification.created_at)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                          onClick={() => handleSendToAll(notification.id)}
                          disabled={isSending === notification.id || isDeleting === notification.id}
                          title="Send to all users"
                          style={{
                            padding: '0.5rem 0.75rem',
                            borderRadius: '6px',
                            border: 'none',
                            background: isSending === notification.id ? 'rgba(33, 150, 243, 0.5)' : 'rgba(33, 150, 243, 0.2)',
                            color: '#2196f3',
                            fontWeight: 500,
                            cursor: isSending === notification.id || isDeleting === notification.id ? 'not-allowed' : 'pointer',
                            fontSize: '0.75rem',
                          }}
                        >
                          {isSending === notification.id ? '...' : 'Send'}
                        </button>
                        <button
                          onClick={() => handleToggleWelcome(notification.id, notification.is_welcome_notification)}
                          disabled={isTogglingWelcome === notification.id || isDeleting === notification.id}
                          title={notification.is_welcome_notification ? 'Remove as welcome notification' : 'Set as welcome notification'}
                          style={{
                            padding: '0.5rem 0.75rem',
                            borderRadius: '6px',
                            border: 'none',
                            background: notification.is_welcome_notification 
                              ? 'rgba(76, 175, 80, 0.3)' 
                              : 'rgba(76, 175, 80, 0.1)',
                            color: '#4caf50',
                            fontWeight: 500,
                            cursor: isTogglingWelcome === notification.id || isDeleting === notification.id ? 'not-allowed' : 'pointer',
                            fontSize: '0.75rem',
                          }}
                        >
                          <span className="material-icons" style={{ fontSize: '1rem', verticalAlign: 'middle' }}>
                            {notification.is_welcome_notification ? 'star' : 'star_border'}
                          </span>
                        </button>
                        <button
                          onClick={() => handleDeleteClick(notification.id, notification.title)}
                          disabled={isSending === notification.id || isDeleting === notification.id}
                          style={{
                            padding: '0.5rem 0.75rem',
                            borderRadius: '6px',
                            border: 'none',
                            background: isDeleting === notification.id ? 'rgba(244, 67, 54, 0.5)' : 'rgba(244, 67, 54, 0.2)',
                            color: '#f44336',
                            fontWeight: 500,
                            cursor: isSending === notification.id || isDeleting === notification.id ? 'not-allowed' : 'pointer',
                            fontSize: '0.75rem',
                          }}
                        >
                          <span className="material-icons" style={{ fontSize: '1rem', verticalAlign: 'middle' }}>
                            delete
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setDeleteModal(null)}
        >
          <div
            style={{
              background: 'rgba(20, 20, 20, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: '1.5rem' }}>
              <span
                className="material-icons"
                style={{
                  fontSize: '3rem',
                  color: '#f44336',
                  display: 'block',
                  marginBottom: '1rem',
                }}
              >
                warning
              </span>
              <h3
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                  color: '#fff',
                }}
              >
                Delete Notification?
              </h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', lineHeight: '1.6' }}>
                Are you sure you want to delete &quot;{deleteModal.title}&quot;?
                This will also remove it from all users&apos; notification lists.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteModal(null)}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'transparent',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#f44336',
                  color: '#fff',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
