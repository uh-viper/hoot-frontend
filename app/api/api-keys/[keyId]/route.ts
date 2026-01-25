import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/validate-session'
import { createClient } from '@/lib/supabase/server'

/**
 * DELETE /api/api-keys/[keyId] - Delete an API key
 * 
 * SECURITY:
 * - Only allows users to delete their own API keys
 * - Verifies key ownership before deletion
 * - UUID validation prevents injection attacks
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ keyId: string }> }
) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { keyId } = await params

    // Validate keyId exists and is a valid UUID format
    if (!keyId || typeof keyId !== 'string' || keyId.trim() === '') {
      return NextResponse.json(
        { error: 'Key ID is required' },
        { status: 400 }
      )
    }

    // Validate UUID format to prevent injection attacks
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(keyId.trim())) {
      return NextResponse.json(
        { error: 'Invalid key ID format' },
        { status: 400 }
      )
    }

    // Verify key ownership - CRITICAL SECURITY CHECK
    const supabase = await createClient()
    const { data: key, error: keyError } = await supabase
      .from('user_keys')
      .select('id, user_id')
      .eq('id', keyId)
      .eq('user_id', user.id) // CRITICAL: Ensure key belongs to this user
      .single()

    if (keyError || !key) {
      // Don't expose whether key exists or not - generic error
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Delete the key
    const { error: deleteError } = await supabase
      .from('user_keys')
      .delete()
      .eq('id', keyId)
      .eq('user_id', user.id) // Double-check ownership in delete query

    if (deleteError) {
      console.error('Error deleting API key:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete API key' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'API key deleted successfully',
    })
  } catch (error) {
    console.error('Unexpected error in DELETE /api/api-keys/[keyId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
