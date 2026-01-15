'use server'

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/validate-session'
import { localDateRangeToUTC } from '@/lib/utils/date-timezone'

// Extend dayjs with plugins
dayjs.extend(utc)
dayjs.extend(timezone)

export async function getUserFilteredStats(startDate?: Date, endDate?: Date) {
  const user = await getSessionUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()

  // Dates are already converted to UTC by DashboardStats component
  // Just convert to ISO strings for database query
  let start: string | undefined
  let end: string | undefined

  if (startDate && endDate) {
    start = startDate.toISOString()
    end = endDate.toISOString()
  }

  // Calculate stats from user_jobs table
  let jobsQuery = supabase
    .from('user_jobs')
    .select('requested_count, successful_count, failed_count, created_at')
    .eq('user_id', user.id)

  if (start && end) {
    jobsQuery = jobsQuery.gte('created_at', start).lte('created_at', end)
  }

  const { data: jobs, error: jobsError } = await jobsQuery

  if (jobsError) {
    console.error('Error fetching user jobs:', jobsError)
    return { error: 'Failed to fetch stats' }
  }

  // Calculate totals from jobs
  const requested = jobs?.reduce((sum, job) => sum + (job.requested_count || 0), 0) ?? 0
  const successful = jobs?.reduce((sum, job) => sum + (job.successful_count || 0), 0) ?? 0
  const failures = jobs?.reduce((sum, job) => sum + (job.failed_count || 0), 0) ?? 0

  // Also get business centers count from user_accounts (for consistency)
  let accountsQuery = supabase
    .from('user_accounts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if (start && end) {
    accountsQuery = accountsQuery.gte('created_at', start).lte('created_at', end)
  }

  const { count: businessCentersCount } = await accountsQuery

  return {
    requested,
    successful,
    failures,
    businessCenters: businessCentersCount ?? 0,
  }
}
