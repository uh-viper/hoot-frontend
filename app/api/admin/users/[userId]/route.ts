import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'

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
    // Note: This requires service role key which we should have in the supabase client
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId)

    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError)
      // User data is already deleted, log the auth error but return success
      // The orphaned auth record will prevent re-signup with same email which is acceptable
      return NextResponse.json({ 
        message: 'User data deleted successfully. Auth record may require manual cleanup.',
        warning: authDeleteError.message
      })
    }

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (err) {
    console.error('Unexpected error deleting user:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
