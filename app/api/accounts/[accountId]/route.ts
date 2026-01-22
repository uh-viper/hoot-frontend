import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/validate-session'
import { createClient } from '@/lib/supabase/server'

/**
 * DELETE /api/accounts/[accountId] - Delete a user account
 * 
 * SECURITY:
 * - Only allows users to delete their own accounts (verified via user_id)
 * - UUID validation prevents injection attacks
 * - Generic error messages prevent information leakage
 * - All requests require authentication
 * - Verifies account ownership before deletion
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    // Validate session
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get accountId from params
    const { accountId } = await params

    // Validate accountId exists and is a valid UUID format
    if (!accountId || typeof accountId !== 'string' || accountId.trim() === '') {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      )
    }

    // Validate UUID format to prevent injection attacks
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(accountId.trim())) {
      return NextResponse.json(
        { error: 'Invalid account ID format' },
        { status: 400 }
      )
    }

    // Verify account ownership - CRITICAL SECURITY CHECK
    // Users can ONLY delete accounts they own
    const supabase = await createClient()
    const { data: account, error: accountError } = await supabase
      .from('user_accounts')
      .select('id, user_id')
      .eq('id', accountId)
      .eq('user_id', user.id) // CRITICAL: Ensure account belongs to this user
      .single()

    if (accountError || !account) {
      // Don't expose whether account exists or not - generic error
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Delete the account
    const { error: deleteError } = await supabase
      .from('user_accounts')
      .delete()
      .eq('id', accountId)
      .eq('user_id', user.id) // Double-check ownership in delete query

    if (deleteError) {
      console.error('Error deleting account:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete account' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully',
    })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/accounts/[accountId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
