import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/validate-session'
import { createClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

/**
 * GET /api/api-keys - List all API keys for the authenticated user
 * 
 * SECURITY:
 * - Only returns API keys for the authenticated user
 * - Uses RLS policies to enforce access control
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
    const { data: keys, error } = await supabase
      .from('user_keys')
      .select('id, key_name, last_used_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching API keys:', error)
      return NextResponse.json(
        { error: 'Failed to fetch API keys' },
        { status: 500 }
      )
    }

    return NextResponse.json({ keys: keys || [] })
  } catch (error) {
    console.error('Unexpected error in GET /api/api-keys:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/api-keys - Create or regenerate API key for the authenticated user
 * 
 * SECURITY:
 * - Only allows users to create/regenerate keys for themselves
 * - Generates cryptographically secure random API key
 * - Validates key_name input
 * - Enforces ONE key per user: deletes existing key before creating new one
 * - CRITICAL: API keys can ONLY access data belonging to the user_id from the key
 * 
 * Request Body:
 * {
 *   "key_name": "Production API"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "key": {
 *     "id": "uuid",
 *     "key_name": "Production API",
 *     "api_key": "hoot_...", // Only shown once on creation
 *     "created_at": "2026-01-25T..."
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { key_name } = body

    // Validate key_name
    if (!key_name || typeof key_name !== 'string' || key_name.trim() === '') {
      return NextResponse.json(
        { error: 'Key name is required' },
        { status: 400 }
      )
    }

    // Validate key_name length (max 100 characters)
    if (key_name.length > 100) {
      return NextResponse.json(
        { error: 'Key name must be 100 characters or less' },
        { status: 400 }
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
    // Format: hoot_<64 random hex characters>
    const randomPart = randomBytes(32).toString('hex')
    const apiKey = `hoot_${randomPart}`

    // Insert new key
    const { data: newKey, error } = await supabase
      .from('user_keys')
      .insert({
        user_id: user.id,
        key_name: key_name.trim(),
        api_key: apiKey,
      })
      .select('id, key_name, api_key, created_at')
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
