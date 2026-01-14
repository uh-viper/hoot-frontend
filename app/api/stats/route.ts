import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/validate-session'
import { createClient } from '@/lib/supabase/server'
import { initializeUserData } from '@/lib/api/user-initialization'
import { rateLimit } from '@/lib/api/rate-limit'

// GET - Fetch user stats
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

    // Ensure user has all required database rows (user_credits, user_profiles)
    await initializeUserData(user.id)

    // Fetch user stats from user_jobs
    const supabase = await createClient()
    const { data: jobs, error: jobsError } = await supabase
      .from('user_jobs')
      .select('requested_count, successful_count, failed_count')
      .eq('user_id', user.id)

    if (jobsError) {
      console.error('Error fetching user jobs:', jobsError)
      return NextResponse.json(
        { error: 'Failed to fetch stats' },
        { status: 500 }
      )
    }

    // Calculate totals from jobs
    const requested = jobs?.reduce((sum, job) => sum + (job.requested_count || 0), 0) ?? 0
    const successful = jobs?.reduce((sum, job) => sum + (job.successful_count || 0), 0) ?? 0
    const failures = jobs?.reduce((sum, job) => sum + (job.failed_count || 0), 0) ?? 0

    // Get business centers count
    const { count: businessCenters } = await supabase
      .from('user_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    return NextResponse.json({
      business_centers: businessCenters ?? 0,
      requested,
      successful,
      failures,
    })
  } catch (error) {
    console.error('Unexpected error in GET /api/stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Create or update user job (for backend use)
// Backend should call this to save job results
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

    const body = await request.json()
    const { job_id, requested_count, successful_count, failed_count, status } = body

    // Validate input
    if (!job_id || typeof job_id !== 'string') {
      return NextResponse.json(
        { error: 'job_id is required' },
        { status: 400 }
      )
    }

    if (
      (requested_count !== undefined && (typeof requested_count !== 'number' || requested_count < 0)) ||
      (successful_count !== undefined && (typeof successful_count !== 'number' || successful_count < 0)) ||
      (failed_count !== undefined && (typeof failed_count !== 'number' || failed_count < 0))
    ) {
      return NextResponse.json(
        { error: 'Invalid count values' },
        { status: 400 }
      )
    }

    // Upsert job record
    const supabase = await createClient()
    const jobData: any = {
      user_id: user.id,
      job_id,
      status: status || 'completed',
    }

    if (requested_count !== undefined) jobData.requested_count = requested_count
    if (successful_count !== undefined) jobData.successful_count = successful_count
    if (failed_count !== undefined) jobData.failed_count = failed_count
    if (status === 'completed') jobData.completed_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('user_jobs')
      .upsert(jobData, { onConflict: 'job_id' })
      .select('job_id, requested_count, successful_count, failed_count, status')
      .single()

    if (error) {
      console.error('Error upserting user job:', error)
      return NextResponse.json(
        { error: 'Failed to save job' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      job_id: data.job_id,
      requested_count: data.requested_count,
      successful_count: data.successful_count,
      failed_count: data.failed_count,
      status: data.status,
    })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
