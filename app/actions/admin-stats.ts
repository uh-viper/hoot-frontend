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
  // The dates are already in UTC, we just need to format them as ISO strings
  const start = dayjs(startDate).utc().toISOString()
  const end = dayjs(endDate).utc().toISOString()

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

  // Fetch user_jobs to get requested and failures in date range
  const { data: jobsInRange } = await supabase
    .from('user_jobs')
    .select('requested_count, failed_count')
    .gte('created_at', start)
    .lte('created_at', end)

  // Sum up the stats from jobs
  const filteredRequested = jobsInRange?.reduce((sum, job) => sum + (job.requested_count || 0), 0) ?? 0
  const filteredFailures = jobsInRange?.reduce((sum, job) => sum + (job.failed_count || 0), 0) ?? 0

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
