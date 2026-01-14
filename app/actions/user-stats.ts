'use server'

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/auth/validate-session'

// Extend dayjs with plugins
dayjs.extend(utc)
dayjs.extend(timezone)

export async function getUserFilteredStats(startDate?: Date, endDate?: Date) {
  const user = await getSessionUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()

  // If no date range, return all-time stats from user_stats
  if (!startDate || !endDate) {
    const { data: statsData } = await supabase
      .from('user_stats')
      .select('requested, successful, failures')
      .eq('user_id', user.id)
      .single()

    const { count: businessCentersCount } = await supabase
      .from('user_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    return {
      requested: statsData?.requested ?? 0,
      successful: statsData?.successful ?? 0,
      failures: statsData?.failures ?? 0,
      businessCenters: businessCentersCount ?? 0,
    }
  }

  // Convert local dates to UTC for database queries
  const start = dayjs(startDate).utc().startOf('day').toISOString()
  const end = dayjs(endDate).utc().endOf('day').toISOString()

  // For date-filtered stats:
  // - Successful: Count accounts created in date range (accurate)
  // - Requested/Failures: Can't filter accurately from user_stats (cumulative totals)
  //   So we'll show all-time totals for these when filtering

  const { count: successfulCount } = await supabase
    .from('user_accounts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', start)
    .lte('created_at', end)

  // Get all-time totals for requested/failures (since we can't filter accurately)
  const { data: statsData } = await supabase
    .from('user_stats')
    .select('requested, failures')
    .eq('user_id', user.id)
    .single()

  return {
    requested: statsData?.requested ?? 0, // All-time (can't filter accurately)
    successful: successfulCount ?? 0, // Filtered by date range
    failures: statsData?.failures ?? 0, // All-time (can't filter accurately)
    businessCenters: successfulCount ?? 0, // Same as successful
  }
}
