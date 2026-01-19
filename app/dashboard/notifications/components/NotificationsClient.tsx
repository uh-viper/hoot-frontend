'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/app/contexts/ToastContext'
import { usePathname } from 'next/navigation'

interface NotificationItem {
  id: string
  is_read: boolean
  read_at: string | null
  created_at: string
  notification: {
    id: string
    title: string
    message: string
    type: string
    created_at: string
  } | null
}

interface NotificationsClientProps {
  initialNotifications: NotificationItem[]
}

export default function NotificationsClient({ initialNotifications }: NotificationsClientProps) {
  const { showSuccess, showError } = useToast()
  const pathname = usePathname()
  const [notifications, setNotifications] = useState(initialNotifications)
  const [isMarkingRead, setIsMarkingRead] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Refetch notifications when component mounts or pathname changes
  useEffect(() => {
    const fetchNotifications = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/notifications')
        if (response.ok) {
          const data = await response.json()
          setNotifications(data.notifications || [])
        }
      } catch (err) {
        console.error('Error fetching notifications:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchNotifications()
  }, [pathname])

  // Also listen for notifications-updated events to refetch
  useEffect(() => {
    const handleNotificationsUpdated = async () => {
      try {
        const response = await fetch('/api/notifications')
        if (response.ok) {
          const data = await response.json()
          setNotifications(data.notifications || [])
        }
      } catch (err) {
        console.error('Error fetching notifications:', err)
      }
    }

    window.addEventListener('notifications-updated', handleNotificationsUpdated)
    return () => {
      window.removeEventListener('notifications-updated', handleNotificationsUpdated)
    }
  }, [])

  const handleMarkAsRead = async (notificationId: string) => {
    setIsMarkingRead(true)
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_ids: [notificationId] }),
      })

      if (!response.ok) {
        throw new Error('Failed to mark as read')
      }

      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      )

      // Dispatch event to update sidebar badge
      window.dispatchEvent(new CustomEvent('notifications-updated'))
    } catch (err) {
      console.error('Error marking notification as read:', err)
      showError('Failed to mark notification as read')
    } finally {
      setIsMarkingRead(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'announcement': return 'campaign'
      case 'welcome': return 'waving_hand'
      case 'system': return 'settings'
      case 'promotion': return 'local_offer'
      default: return 'notifications'
    }
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

  return (
    <div className="notifications-container" style={{ marginTop: '2rem' }}>
      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '4rem 2rem', 
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
        }}>
          <span className="material-icons" style={{ fontSize: '4rem', opacity: 0.3, marginBottom: '1rem', display: 'block' }}>
            notifications_none
          </span>
          <h3 style={{ marginBottom: '0.5rem', opacity: 0.7 }}>No notifications yet</h3>
          <p style={{ opacity: 0.5 }}>You&apos;ll see important updates and announcements here</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {notifications.map((item) => {
            const notification = item.notification
            if (!notification) return null

            return (
              <div
                key={item.id}
                style={{
                  padding: '1.25rem',
                  background: item.is_read 
                    ? 'rgba(255, 255, 255, 0.02)' 
                    : 'rgba(212, 175, 55, 0.05)',
                  borderRadius: '12px',
                  border: item.is_read 
                    ? '1px solid rgba(255, 255, 255, 0.05)' 
                    : '1px solid rgba(212, 175, 55, 0.2)',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                }}
              >
                {/* Unread indicator */}
                {!item.is_read && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '1.25rem',
                      right: '1.25rem',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: '#d4af37',
                    }}
                  />
                )}

                <div style={{ display: 'flex', gap: '1rem' }}>
                  {/* Icon */}
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: `${getTypeColor(notification.type)}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span 
                      className="material-icons" 
                      style={{ color: getTypeColor(notification.type), fontSize: '1.25rem' }}
                    >
                      {getTypeIcon(notification.type)}
                    </span>
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <h3 style={{ 
                        fontSize: '1rem', 
                        fontWeight: 600, 
                        margin: 0,
                        opacity: item.is_read ? 0.7 : 1,
                      }}>
                        {notification.title}
                      </h3>
                    </div>
                    <p style={{ 
                      margin: '0 0 0.75rem 0', 
                      opacity: item.is_read ? 0.5 : 0.8,
                      lineHeight: 1.5,
                      fontSize: '0.9rem',
                    }}>
                      {notification.message}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>
                        {formatDate(item.created_at)}
                      </span>
                      {!item.is_read && (
                        <button
                          onClick={() => handleMarkAsRead(item.id)}
                          disabled={isMarkingRead}
                          style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '6px',
                            border: 'none',
                            background: 'rgba(255, 255, 255, 0.1)',
                            color: 'rgba(255, 255, 255, 0.8)',
                            fontWeight: 500,
                            cursor: isMarkingRead ? 'not-allowed' : 'pointer',
                            fontSize: '0.75rem',
                          }}
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
