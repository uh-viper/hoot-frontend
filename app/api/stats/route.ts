import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth/validate-session'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/api/rate-limit'

// GET - Fetch user stats
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!rateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      )
    }

    // Validate session
    const user = await validateSession()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch user stats
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('user_stats')
      .select('business_centers, requested, successful, failures')
      .eq('user_id', user.id)
      .single()

    if (error) {
      // If stats don't exist, create them with default values
      if (error.code === 'PGRST116') {
        const { data: newStats, error: insertError } = await supabase
          .from('user_stats')
          .insert({
            user_id: user.id,
            business_centers: 0,
            requested: 0,
            successful: 0,
            failures: 0,
          })
          .select('business_centers, requested, successful, failures')
          .single()

        if (insertError) {
          console.error('Error creating user stats:', insertError)
          return NextResponse.json(
            { error: 'Failed to create stats' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          business_centers: newStats.business_centers,
          requested: newStats.requested,
          successful: newStats.successful,
          failures: newStats.failures,
        })
      }

      console.error('Error fetching user stats:', error)
      return NextResponse.json(
        { error: 'Failed to fetch stats' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      business_centers: data.business_centers,
      requested: data.requested,
      successful: data.successful,
      failures: data.failures,
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update user stats (for backend/internal use)
export async function PATCH(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!rateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      )
    }

    // Validate session
    const user = await validateSession()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { business_centers, requested, successful, failures } = body

    // Validate input
    if (
      (business_centers !== undefined && (typeof business_centers !== 'number' || business_centers < 0)) ||
      (requested !== undefined && (typeof requested !== 'number' || requested < 0)) ||
      (successful !== undefined && (typeof successful !== 'number' || successful < 0)) ||
      (failures !== undefined && (typeof failures !== 'number' || failures < 0))
    ) {
      return NextResponse.json(
        { error: 'Invalid input values' },
        { status: 400 }
      )
    }

    // Build update object
    const updates: Record<string, number> = {}
    if (business_centers !== undefined) updates.business_centers = business_centers
    if (requested !== undefined) updates.requested = requested
    if (successful !== undefined) updates.successful = successful
    if (failures !== undefined) updates.failures = failures

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Update stats
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('user_stats')
      .update(updates)
      .eq('user_id', user.id)
      .select('business_centers, requested, successful, failures')
      .single()

    if (error) {
      // If stats don't exist, create them
      if (error.code === 'PGRST116') {
        const { data: newStats, error: insertError } = await supabase
          .from('user_stats')
          .insert({
            user_id: user.id,
            business_centers: business_centers ?? 0,
            requested: requested ?? 0,
            successful: successful ?? 0,
            failures: failures ?? 0,
          })
          .select('business_centers, requested, successful, failures')
          .single()

        if (insertError) {
          console.error('Error creating user stats:', insertError)
          return NextResponse.json(
            { error: 'Failed to create stats' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          business_centers: newStats.business_centers,
          requested: newStats.requested,
          successful: newStats.successful,
          failures: newStats.failures,
        })
      }

      console.error('Error updating user stats:', error)
      return NextResponse.json(
        { error: 'Failed to update stats' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      business_centers: data.business_centers,
      requested: data.requested,
      successful: data.successful,
      failures: data.failures,
    })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
