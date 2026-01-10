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

// PATCH - Update user credits
export async function PATCH(request: NextRequest) {
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

    // Ensure user has all required database rows
    await initializeUserData(user.id)

    const body = await request.json()
    const { credits, operation } = body // operation: 'set', 'add', 'subtract'

    // Validate input
    if (credits === undefined || typeof credits !== 'number' || credits < 0) {
      return NextResponse.json(
        { error: 'Invalid credits value' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Fetch current credits (should exist after initializeUserData)
    const { data: currentData, error: fetchError } = await supabase
      .from('user_credits')
      .select('credits')
      .eq('user_id', user.id)
      .single()

    if (fetchError) {
      console.error('Error fetching user credits after initialization:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch credits' },
        { status: 500 }
      )
    }

    // Apply operation
    let newCredits = credits
    if (operation === 'add') {
      newCredits = currentData.credits + credits
    } else if (operation === 'subtract') {
      newCredits = Math.max(0, currentData.credits - credits) // Prevent negative
    } else {
      // 'set' or default
      newCredits = credits
    }

    // Update or create credits
    const { data, error } = await supabase
      .from('user_credits')
      .upsert({
        user_id: user.id,
        credits: newCredits,
      }, {
        onConflict: 'user_id'
      })
      .select('credits')
      .single()

    if (error) {
      console.error('Error updating user credits:', error)
      return NextResponse.json(
        { error: 'Failed to update credits' },
        { status: 500 }
      )
    }

    return NextResponse.json({ credits: data.credits })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/credits:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
