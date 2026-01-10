import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/validate-session'
import { createClient } from '@/lib/supabase/server'
import { initializeUserData } from '@/lib/api/user-initialization'
import { rateLimit } from '@/lib/api/rate-limit'

// GET - Fetch user credits
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = rateLimit(request)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: rateLimitResult.message || 'Too many requests' },
        { status: 429 }
      )
    }

    // Validate session
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Ensure user has all required database rows (user_credits, user_stats, user_profiles)
    await initializeUserData(user.id)

    // Fetch user credits
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('user_credits')
      .select('credits')
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error fetching user credits:', error)
      return NextResponse.json(
        { error: 'Failed to fetch credits' },
        { status: 500 }
      )
    }

    return NextResponse.json({ credits: data.credits })
  } catch (error) {
    console.error('Unexpected error in GET /api/credits:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// NOTE: PATCH endpoint removed for security reasons
// Credits can ONLY be modified through:
// 1. Stripe webhook (verified payment)
// 2. Admin/internal functions (for refunds, corrections, etc.)
// Direct user modification of credits is NOT allowed to prevent abuse
