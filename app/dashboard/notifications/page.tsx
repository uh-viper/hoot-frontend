import { getSessionUser } from '@/lib/auth/validate-session'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Metadata } from 'next'
import NotificationsClient from './components/NotificationsClient'
import '../../styles/dashboard.css'

export const metadata: Metadata = {
  title: 'Hoot - Notifications',
}

export default async function NotificationsPage() {
  const user = await getSessionUser()

  if (!user) {
    redirect('/login')
  }

  const supabase = await createClient()

  // Fetch user's notifications with notification details
  const { data: notifications, error } = await supabase
    .from('user_notifications')
    .select(`
      id,
      is_read,
      read_at,
      created_at,
      notification:notifications (
        id,
        title,
        message,
        type,
        created_at
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching notifications:', error)
  }

  // Format notifications for client component
  type NotificationDetails = {
    id: string
    title: string
    message: string
    type: string
    created_at: string
  }
  
  const formattedNotifications = (notifications || []).map(n => ({
    id: n.id,
    is_read: n.is_read,
    read_at: n.read_at,
    created_at: n.created_at,
    notification: n.notification as unknown as NotificationDetails | null,
  })).filter(n => n.notification !== null)

  const unreadCount = formattedNotifications.filter(n => !n.is_read).length

  return (
    <div className="dashboard-content">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Notifications</h1>
        <p className="dashboard-subtitle">
          {unreadCount > 0 
            ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
            : 'Stay up to date with the latest updates'}
        </p>
      </div>

      <NotificationsClient initialNotifications={formattedNotifications} />
    </div>
  )
}
