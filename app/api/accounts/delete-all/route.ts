import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/validate-session'
import { createClient } from '@/lib/supabase/server'

/**
 * DELETE /api/accounts/delete-all - Delete all accounts for the authenticated user
 * 
 * SECURITY:
 * - Only allows users to delete their own accounts (verified via user_id)
 * - All requests require authentication
 * - Verifies user ownership before deletion
 */
export async function DELETE(request: NextRequest) {
  try {
    // Validate session
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // Get count of user's accounts before deletion
    const { count, error: countError } = await supabase
      .from('user_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (countError) {
      console.error('Error counting accounts:', countError)
      return NextResponse.json(
        { error: 'Failed to count accounts' },
        { status: 500 }
      )
    }

    // Delete all accounts owned by this user
    const { error: deleteError } = await supabase
      .from('user_accounts')
      .delete()
      .eq('user_id', user.id) // CRITICAL: Only delete accounts owned by this user

    if (deleteError) {
      console.error('Error deleting all accounts:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete accounts' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${count || 0} account${count !== 1 ? 's' : ''}`,
      deletedCount: count || 0,
    })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/accounts/delete-all:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
