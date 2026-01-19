import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { createClient } from '@supabase/supabase-js'

// DELETE /api/admin/users/[userId] - Delete a user and all their data
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const adminCheck = await validateAdmin()
  if ('error' in adminCheck) {
    return NextResponse.json({ error: adminCheck.error, message: adminCheck.message }, { status: 401 })
  }

  const { supabase, user: adminUser } = adminCheck
  const { userId } = await params

  // Prevent admins from deleting themselves
  if (userId === adminUser.id) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
  }

  try {
    // Check if user exists and get their info
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_id, is_admin')
      .eq('user_id', userId)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent deleting other admins (optional safety measure)
    if (userProfile.is_admin) {
      return NextResponse.json({ error: 'Cannot delete admin users' }, { status: 403 })
    }

    // Delete user data from all related tables
    // Order matters due to foreign key constraints - delete from child tables first
    
    // 1. Delete user notifications
    await supabase
      .from('user_notifications')
      .delete()
      .eq('user_id', userId)

    // 2. Delete user jobs
    await supabase
      .from('user_jobs')
      .delete()
      .eq('user_id', userId)

    // 3. Delete user accounts (vault items)
    await supabase
      .from('user_accounts')
      .delete()
      .eq('user_id', userId)

    // 4. Delete purchases
    await supabase
      .from('purchases')
      .delete()
      .eq('user_id', userId)

    // 5. Delete user credits
    await supabase
      .from('user_credits')
      .delete()
      .eq('user_id', userId)

    // 6. Delete user stats
    await supabase
      .from('user_stats')
      .delete()
      .eq('user_id', userId)

    // 7. Delete user profile
    const { error: deleteProfileError } = await supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', userId)

    if (deleteProfileError) {
      console.error('Error deleting user profile:', deleteProfileError)
      return NextResponse.json({ error: 'Failed to delete user profile' }, { status: 500 })
    }

    // 8. Delete the auth user using admin API
    // This requires service role key to use auth.admin.deleteUser()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!serviceRoleKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not configured')
      return NextResponse.json({ 
        error: 'Server configuration error: Service role key not available',
        message: 'User data deleted successfully, but auth record could not be deleted. Please configure SUPABASE_SERVICE_ROLE_KEY.'
      }, { status: 500 })
    }

    // Create service role client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError)
      return NextResponse.json({ 
        error: 'Failed to delete auth user',
        message: 'User data deleted successfully, but auth record deletion failed.',
        warning: authDeleteError.message
      }, { status: 500 })
    }

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (err) {
    console.error('Unexpected error deleting user:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
