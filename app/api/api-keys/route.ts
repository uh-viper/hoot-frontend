import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/validate-session'
import { createClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

/**
 * GET /api/api-keys - Get API key status for the authenticated user
 * 
 * SECURITY:
 * - Only returns API key status for the authenticated user
 * - Uses RLS policies to enforce access control
 * - Does NOT return the actual API key (only shown once on creation)
 */
export async function GET() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = await createClient()
    const { data: key, error } = await supabase
      .from('user_keys')
      .select('id, last_used_at, created_at')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Error fetching API key:', error)
      return NextResponse.json(
        { error: 'Failed to fetch API key' },
        { status: 500 }
      )
    }

    return NextResponse.json({ hasKey: !!key, key: key || null })
  } catch (error) {
    console.error('Unexpected error in GET /api/api-keys:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/api-keys - Generate or regenerate API key for the authenticated user
 * 
 * SECURITY:
 * - Only allows users to generate/regenerate keys for themselves
 * - Generates cryptographically secure random API key (70 characters)
 * - Enforces ONE key per user: deletes existing key before creating new one
 * - CRITICAL: API keys can ONLY access data belonging to the user_id from the key
 * 
 * Request Body: (none required)
 * 
 * Response:
 * {
 *   "success": true,
 *   "key": {
 *     "id": "uuid",
 *     "api_key": "70 character random string", // Only shown once on creation
 *     "created_at": "2026-01-25T..."
 *   }
 * }
 */
export async function POST() {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // SECURITY: Delete existing key if it exists (regenerate behavior)
    // This ensures only ONE key per user
    const { error: deleteError } = await supabase
      .from('user_keys')
      .delete()
      .eq('user_id', user.id) // CRITICAL: Only delete keys belonging to this user

    if (deleteError) {
      console.error('Error deleting existing API key:', deleteError)
      // Continue anyway - might not have an existing key
    }

    // Generate cryptographically secure API key
    // Format: 70 random characters (alphanumeric + special chars for security)
    // Using base64 encoding for better entropy and character variety
    const randomData = randomBytes(52) // 52 bytes = ~70 chars in base64
    const apiKey = randomData.toString('base64').slice(0, 70)

    // Insert new key
    const { data: newKey, error } = await supabase
      .from('user_keys')
      .insert({
        user_id: user.id,
        api_key: apiKey,
      })
      .select('id, api_key, created_at')
      .single()

    if (error) {
      console.error('Error creating API key:', error)
      return NextResponse.json(
        { error: 'Failed to create API key' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      key: newKey,
    })
  } catch (error) {
    console.error('Unexpected error in POST /api/api-keys:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
