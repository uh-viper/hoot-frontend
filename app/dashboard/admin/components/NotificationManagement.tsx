'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/app/contexts/ToastContext'
import './notification-management.css'

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
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'announcement':
        return {
          icon: 'campaign',
          color: '#2196f3',
          bgColor: 'rgba(33, 150, 243, 0.1)',
          label: 'Announcement'
        }
      case 'welcome':
        return {
          icon: 'waving_hand',
          color: '#4caf50',
          bgColor: 'rgba(76, 175, 80, 0.1)',
          label: 'Welcome'
        }
      case 'system':
        return {
          icon: 'settings',
          color: '#ff9800',
          bgColor: 'rgba(255, 152, 0, 0.1)',
          label: 'System'
        }
      case 'promotion':
        return {
          icon: 'local_offer',
          color: '#e91e63',
          bgColor: 'rgba(233, 30, 99, 0.1)',
          label: 'Promotion'
        }
      default:
        return {
          icon: 'notifications',
          color: '#9e9e9e',
          bgColor: 'rgba(158, 158, 158, 0.1)',
          label: 'Notification'
        }
    }
  }

  if (isLoading) {
    return (
      <div className="notification-loading">
        <div className="notification-spinner"></div>
        <p>Loading notifications...</p>
      </div>
    )
  }

  const welcomeNotification = notifications.find(n => n.is_welcome_notification)
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.notification-type-dropdown')) {
        setIsTypeDropdownOpen(false)
      }
    }
    if (isTypeDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isTypeDropdownOpen])

  return (
    <div className="notification-management">
      <div className="notification-header">
        <div className="notification-header-content">
          <span className="material-icons notification-header-icon">notifications</span>
          <div>
            <h3 className="notification-title">Notifications</h3>
            <p className="notification-subtitle">{notifications.length} total notification{notifications.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* Create Notification Form */}
      <div className="notification-form-card">
        <div className="notification-form-header">
          <div className="notification-form-header-left">
            <span className="material-icons">add_circle</span>
            <h4>Create New Notification</h4>
          </div>
          <div className={`notification-welcome-indicator ${welcomeNotification ? 'active' : 'inactive'}`}>
            <span className="material-icons">{welcomeNotification ? 'check_circle' : 'cancel'}</span>
            <span>Welcome Message</span>
          </div>
        </div>
        <form onSubmit={handleCreate} className="notification-form">
          <div className="notification-form-row">
            <div className="notification-form-group">
              <label htmlFor="notification-title">
                <span className="material-icons">title</span>
                Title
              </label>
              <input
                id="notification-title"
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Enter notification title..."
                disabled={isCreating}
                className="notification-input"
              />
            </div>

            <div className="notification-form-group">
              <label>
                <span className="material-icons">category</span>
                Type
              </label>
              <div className={`notification-type-dropdown ${isTypeDropdownOpen ? 'open' : ''}`}>
                <button
                  type="button"
                  onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                  disabled={isCreating}
                  className="notification-type-dropdown-button"
                >
                  <div className="notification-type-selected">
                    <span 
                      className="notification-type-icon-small"
                      style={{ 
                        backgroundColor: getTypeConfig(newType).bgColor,
                        color: getTypeConfig(newType).color
                      }}
                    >
                      <span className="material-icons">{getTypeConfig(newType).icon}</span>
                    </span>
                    <span>{getTypeConfig(newType).label}</span>
                  </div>
                  <span className="material-icons">arrow_drop_down</span>
                </button>
                {isTypeDropdownOpen && (
                  <div className="notification-type-dropdown-menu">
                    {(['announcement', 'welcome', 'system', 'promotion'] as const).map((type) => {
                      const config = getTypeConfig(type)
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setNewType(type)
                            setIsTypeDropdownOpen(false)
                          }}
                          className={`notification-type-option ${newType === type ? 'active' : ''}`}
                        >
                          <span 
                            className="notification-type-icon-small"
                            style={{ 
                              backgroundColor: config.bgColor,
                              color: config.color
                            }}
                          >
                            <span className="material-icons">{config.icon}</span>
                          </span>
                          <span>{config.label}</span>
                          {newType === type && (
                            <span className="material-icons">check</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
            
          <div className="notification-form-group">
            <label htmlFor="notification-message">
              <span className="material-icons">message</span>
              Message
            </label>
            <textarea
              id="notification-message"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Enter notification message..."
              disabled={isCreating}
              rows={3}
              className="notification-textarea"
            />
          </div>

          <div className="notification-form-options-row">
            <label className="notification-checkbox-label-simple">
              <input
                type="checkbox"
                checked={sendToAll}
                onChange={(e) => setSendToAll(e.target.checked)}
                disabled={isCreating}
                className="notification-checkbox"
              />
              <span className="notification-checkbox-custom"></span>
              <span>Send to all</span>
            </label>
            <label className="notification-checkbox-label-simple">
              <input
                type="checkbox"
                checked={setAsWelcome}
                onChange={(e) => setSetAsWelcome(e.target.checked)}
                disabled={isCreating}
                className="notification-checkbox"
              />
              <span className="notification-checkbox-custom"></span>
              <span>Set as welcome</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isCreating || !newTitle.trim() || !newMessage.trim()}
            className="notification-submit-btn"
          >
            <span className="material-icons">{isCreating ? 'hourglass_empty' : 'send'}</span>
            {isCreating ? 'Creating...' : 'Create Notification'}
          </button>
        </form>
      </div>

      {/* Notifications List */}
      <div className="notification-list-section">
        <div className="notification-list-header">
          <h4>All Notifications</h4>
          <span className="notification-count-badge">{notifications.length}</span>
        </div>

        {notifications.length === 0 ? (
          <div className="notification-empty">
            <span className="material-icons">notifications_off</span>
            <h4>No notifications yet</h4>
            <p>Create your first notification to start communicating with users</p>
          </div>
        ) : (
          <div className="notification-cards">
            {notifications.map((notification) => {
              const typeConfig = getTypeConfig(notification.type)
              const readPercentage = notification.sent_count > 0 
                ? Math.round((notification.read_count / notification.sent_count) * 100)
                : 0

              return (
                <div key={notification.id} className="notification-card">
                  <div className="notification-card-header">
                    <div className="notification-card-type">
                      <div 
                        className="notification-type-icon"
                        style={{ 
                          backgroundColor: typeConfig.bgColor,
                          color: typeConfig.color
                        }}
                      >
                        <span className="material-icons">{typeConfig.icon}</span>
                      </div>
                      <div className="notification-card-title-group">
                        <h5 className="notification-card-title">{notification.title}</h5>
                        <div className="notification-card-badges">
                          <span 
                            className="notification-type-badge"
                            style={{ 
                              backgroundColor: typeConfig.bgColor,
                              color: typeConfig.color
                            }}
                          >
                            {typeConfig.label}
                          </span>
                          {notification.is_welcome_notification && (
                            <span className="notification-welcome-badge">
                              <span className="material-icons">star</span>
                              Welcome
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="notification-card-date">
                      {formatDate(notification.created_at)}
                    </div>
                  </div>

                  <p className="notification-card-message">{notification.message}</p>

                  <div className="notification-card-stats">
                    <div className="notification-stat">
                      <span className="material-icons">send</span>
                      <div>
                        <span className="notification-stat-value">{notification.sent_count}</span>
                        <span className="notification-stat-label">Sent</span>
                      </div>
                    </div>
                    <div className="notification-stat">
                      <span className="material-icons">visibility</span>
                      <div>
                        <span className="notification-stat-value">{notification.read_count}</span>
                        <span className="notification-stat-label">Read</span>
                      </div>
                    </div>
                    <div className="notification-stat">
                      <span className="material-icons">trending_up</span>
                      <div>
                        <span className="notification-stat-value">{readPercentage}%</span>
                        <span className="notification-stat-label">Read Rate</span>
                      </div>
                    </div>
                  </div>

                  {notification.sent_count > 0 && (
                    <div className="notification-progress">
                      <div 
                        className="notification-progress-bar"
                        style={{ width: `${readPercentage}%` }}
                      />
                    </div>
                  )}

                  <div className="notification-card-actions">
                    <button
                      onClick={() => handleSendToAll(notification.id)}
                      disabled={isSending === notification.id || isDeleting === notification.id}
                      className="notification-action-btn notification-action-send"
                      title="Send to all users"
                    >
                      <span className="material-icons">send</span>
                      {isSending === notification.id ? 'Sending...' : 'Send to All'}
                    </button>
                    <button
                      onClick={() => handleToggleWelcome(notification.id, notification.is_welcome_notification)}
                      disabled={isTogglingWelcome === notification.id || isDeleting === notification.id}
                      className={`notification-action-btn notification-action-welcome ${notification.is_welcome_notification ? 'active' : ''}`}
                      title={notification.is_welcome_notification ? 'Remove as welcome notification' : 'Set as welcome notification'}
                    >
                      <span className="material-icons">
                        {notification.is_welcome_notification ? 'star' : 'star_border'}
                      </span>
                      {notification.is_welcome_notification ? 'Welcome' : 'Set Welcome'}
                    </button>
                    <button
                      onClick={() => handleDeleteClick(notification.id, notification.title)}
                      disabled={isSending === notification.id || isDeleting === notification.id}
                      className="notification-action-btn notification-action-delete"
                      title="Delete notification"
                    >
                      <span className="material-icons">delete</span>
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="notification-modal-overlay" onClick={() => setDeleteModal(null)}>
          <div className="notification-modal" onClick={(e) => e.stopPropagation()}>
            <div className="notification-modal-icon">
              <span className="material-icons">warning</span>
            </div>
            <h3 className="notification-modal-title">Delete Notification?</h3>
            <p className="notification-modal-message">
              Are you sure you want to delete &quot;{deleteModal.title}&quot;?
              This will also remove it from all users&apos; notification lists.
            </p>
            <div className="notification-modal-actions">
              <button
                onClick={() => setDeleteModal(null)}
                className="notification-modal-btn notification-modal-btn-cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="notification-modal-btn notification-modal-btn-delete"
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
