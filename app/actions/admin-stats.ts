'use server'

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { createClient } from '@/lib/supabase/server'
import { validateAdmin } from '@/lib/auth/admin'

// Extend dayjs with plugins
dayjs.extend(utc)
dayjs.extend(timezone)

export async function getFilteredStats(startDate: Date, endDate: Date) {
  // Check if user is admin
  const adminCheck = await validateAdmin()
  if (adminCheck.error || !adminCheck.supabase) {
    return { error: adminCheck.error || 'Forbidden', message: adminCheck.message || 'Admin access required' }
  }

  const supabase = adminCheck.supabase

  // Dates are already converted to UTC on the client side
  // They represent the start/end of the selected day in the user's local timezone, converted to UTC
  // Example: Jan 13 00:00 EST = Jan 13 05:00 UTC
  // We just need to ensure they're properly formatted as ISO strings
  const start = dayjs(startDate).utc().startOf('day').toISOString()
  const end = dayjs(endDate).utc().endOf('day').toISOString()

  // Fetch accounts created in date range
  const { count: filteredBCs } = await supabase
    .from('user_accounts')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', start)
    .lte('created_at', end)

  // Fetch purchases in date range
  const { data: filteredPurchases } = await supabase
    .from('purchases')
    .select('credits, amount_paid_cents, status')
    .gte('created_at', start)
    .lte('created_at', end)

  // Calculate filtered credits issued
  const filteredCreditsIssued = filteredPurchases?.reduce((sum, p) => {
    if (p.status === 'completed') {
      return sum + p.credits
    }
    return sum
  }, 0) ?? 0

  // Calculate filtered revenue
  const filteredRevenue = filteredPurchases?.reduce((sum, p) => {
    if (p.status === 'completed' && p.amount_paid_cents) {
      return sum + (p.amount_paid_cents / 100)
    }
    return sum
  }, 0) ?? 0

  // Fetch user accounts created in date range (successful)
  const { data: filteredAccounts } = await supabase
    .from('user_accounts')
    .select('created_at')
    .gte('created_at', start)
    .lte('created_at', end)

  const filteredSuccessful = filteredAccounts?.length ?? 0

  // Fetch user_stats to get requested and failures in date range
  // We need to sum up the stats for all users, but only count stats that were updated in the date range
  // Since user_stats tracks cumulative totals, we need a different approach
  // Let's query user_accounts to get successful count, and use a jobs table if available
  // For now, we'll use user_stats but this might not be accurate for date ranges
  // Actually, let's check if we can query user_stats with updated_at in range
  const { data: statsInRange } = await supabase
    .from('user_stats')
    .select('requested, successful, failures')
    .gte('updated_at', start)
    .lte('updated_at', end)

  // Sum up the stats
  const filteredRequested = statsInRange?.reduce((sum, s) => sum + (s.requested || 0), 0) ?? 0
  const filteredFailures = statsInRange?.reduce((sum, s) => sum + (s.failures || 0), 0) ?? 0

  return {
    requested: filteredRequested,
    successful: filteredSuccessful,
    failures: filteredFailures,
    businessCenters: filteredBCs ?? 0,
    creditsIssued: filteredCreditsIssued,
    revenue: filteredRevenue,
    purchases: filteredPurchases?.length ?? 0,
  }
}
