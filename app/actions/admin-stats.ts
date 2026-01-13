'use server'

import { createClient } from '@/lib/supabase/server'
import { validateAdmin } from '@/lib/auth/admin'

export async function getFilteredStats(startDate: Date, endDate: Date) {
  // Check if user is admin
  const adminCheck = await validateAdmin()
  if (adminCheck.error || !adminCheck.supabase) {
    return { error: adminCheck.error || 'Forbidden', message: adminCheck.message || 'Admin access required' }
  }

  const supabase = adminCheck.supabase

  // Ensure dates are in UTC and set to start/end of day
  // Extract UTC components to avoid timezone conversion issues
  const startYear = startDate.getUTCFullYear()
  const startMonth = startDate.getUTCMonth()
  const startDay = startDate.getUTCDate()
  const start = new Date(Date.UTC(startYear, startMonth, startDay, 0, 0, 0, 0))
  
  const endYear = endDate.getUTCFullYear()
  const endMonth = endDate.getUTCMonth()
  const endDay = endDate.getUTCDate()
  const end = new Date(Date.UTC(endYear, endMonth, endDay, 23, 59, 59, 999))

  // Fetch accounts created in date range
  const { count: filteredBCs } = await supabase
    .from('user_accounts')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())

  // Fetch purchases in date range
  const { data: filteredPurchases } = await supabase
    .from('purchases')
    .select('credits, amount_paid_cents, status')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())

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
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())

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
    .gte('updated_at', start.toISOString())
    .lte('updated_at', end.toISOString())

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
