import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'

// GET /api/admin/notifications - List all notifications
export async function GET() {
  const adminCheck = await validateAdmin()
  if ('error' in adminCheck) {
    return NextResponse.json({ error: adminCheck.error, message: adminCheck.message }, { status: 401 })
  }

  const { supabase } = adminCheck

  try {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching notifications:', error)
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }

    // Get sent count for each notification
    const notificationsWithStats = await Promise.all(
      (notifications || []).map(async (notification) => {
        const { count: sentCount } = await supabase
          .from('user_notifications')
          .select('*', { count: 'exact', head: true })
          .eq('notification_id', notification.id)

        const { count: readCount } = await supabase
          .from('user_notifications')
          .select('*', { count: 'exact', head: true })
          .eq('notification_id', notification.id)
          .eq('is_read', true)

        return {
          ...notification,
          sent_count: sentCount || 0,
          read_count: readCount || 0,
        }
      })
    )

    return NextResponse.json({ notifications: notificationsWithStats })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/notifications - Create a new notification
export async function POST(request: NextRequest) {
  const adminCheck = await validateAdmin()
  if ('error' in adminCheck) {
    return NextResponse.json({ error: adminCheck.error, message: adminCheck.message }, { status: 401 })
  }

  const { supabase, user } = adminCheck

  try {
    const body = await request.json()
    const { title, message, type, is_welcome_notification, send_to_all } = body

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const validTypes = ['announcement', 'welcome', 'system', 'promotion']
    const notificationType = validTypes.includes(type) ? type : 'announcement'

    // Insert new notification
    const { data: newNotification, error } = await supabase
      .from('notifications')
      .insert({
        title: title.trim(),
        message: message.trim(),
        type: notificationType,
        is_welcome_notification: is_welcome_notification === true,
        send_to_all: send_to_all === true,
        is_active: true,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating notification:', error)
      return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
    }

    // If send_to_all is true, send to all existing users
    let sentCount = 0
    if (send_to_all === true) {
      const { data: count } = await supabase.rpc('send_notification_to_all_users', {
        p_notification_id: newNotification.id
      })
      sentCount = count || 0
    }

    return NextResponse.json({ 
      notification: newNotification, 
      sent_count: sentCount,
      message: send_to_all ? `Notification created and sent to ${sentCount} users` : 'Notification created successfully' 
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
