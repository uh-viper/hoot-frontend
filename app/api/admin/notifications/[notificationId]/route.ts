import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'

// DELETE /api/admin/notifications/[notificationId] - Delete a notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  const adminCheck = await validateAdmin()
  if ('error' in adminCheck) {
    return NextResponse.json({ error: adminCheck.error, message: adminCheck.message }, { status: 401 })
  }

  const { supabase } = adminCheck
  const { notificationId } = await params

  try {
    // Check if notification exists
    const { data: existing } = await supabase
      .from('notifications')
      .select('id, title')
      .eq('id', notificationId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    // Delete the notification (cascades to user_notifications)
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)

    if (error) {
      console.error('Error deleting notification:', error)
      return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Notification deleted successfully' })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/notifications/[notificationId] - Update a notification
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  const adminCheck = await validateAdmin()
  if ('error' in adminCheck) {
    return NextResponse.json({ error: adminCheck.error, message: adminCheck.message }, { status: 401 })
  }

  const { supabase } = adminCheck
  const { notificationId } = await params

  try {
    const body = await request.json()
    const { title, message, type, is_active, is_welcome_notification } = body

    // Check if notification exists
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('id', notificationId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    // Build update object
    const updateData: {
      title?: string
      message?: string
      type?: string
      is_active?: boolean
      is_welcome_notification?: boolean
    } = {}

    if (typeof title === 'string' && title.trim().length > 0) {
      updateData.title = title.trim()
    }
    if (typeof message === 'string' && message.trim().length > 0) {
      updateData.message = message.trim()
    }
    if (typeof type === 'string') {
      const validTypes = ['announcement', 'welcome', 'system', 'promotion']
      if (validTypes.includes(type)) {
        updateData.type = type
      }
    }
    if (typeof is_active === 'boolean') {
      updateData.is_active = is_active
    }
    if (typeof is_welcome_notification === 'boolean') {
      updateData.is_welcome_notification = is_welcome_notification
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Update the notification
    const { data: updatedNotification, error } = await supabase
      .from('notifications')
      .update(updateData)
      .eq('id', notificationId)
      .select()
      .single()

    if (error) {
      console.error('Error updating notification:', error)
      return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
    }

    return NextResponse.json({ notification: updatedNotification, message: 'Notification updated successfully' })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/notifications/[notificationId]/send - Send notification to all users
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ notificationId: string }> }
) {
  const adminCheck = await validateAdmin()
  if ('error' in adminCheck) {
    return NextResponse.json({ error: adminCheck.error, message: adminCheck.message }, { status: 401 })
  }

  const { supabase } = adminCheck
  const { notificationId } = await params

  try {
    // Check if notification exists
    const { data: existing } = await supabase
      .from('notifications')
      .select('id, title')
      .eq('id', notificationId)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    // Send to all users
    const { data: count, error } = await supabase.rpc('send_notification_to_all_users', {
      p_notification_id: notificationId
    })

    if (error) {
      console.error('Error sending notification:', error)
      return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
    }

    return NextResponse.json({ 
      sent_count: count || 0,
      message: `Notification sent to ${count || 0} users` 
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
