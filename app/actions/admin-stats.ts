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

  // Set time to start and end of day
  const start = new Date(startDate)
  start.setUTCHours(0, 0, 0, 0)
  
  const end = new Date(endDate)
  end.setUTCHours(23, 59, 59, 999)

  // Fetch accounts created in date range
  const { count: filteredBCs } = await supabase
    .from('user_accounts')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())

  // Fetch purchases in date range
  const { data: filteredPurchases } = await supabase
    .from('purchases')
    .select('credits, amount, status')
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
    if (p.status === 'completed' && p.amount) {
      return sum + (p.amount / 100)
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

  // For requested and failures, we need to check jobs/creation attempts
  // Since we don't have a jobs table, we'll estimate based on successful + a failure rate
  // Or we could query user_accounts with status if that exists
  // For now, let's use a simpler approach: count all accounts as both requested and successful
  // and estimate failures (this is a limitation - ideally we'd have a jobs table)
  
  // We can check if there are any patterns, but for now:
  // Requested = successful (since we only have successful accounts in user_accounts)
  // This means we can't accurately track failures without a jobs table
  // Let's return what we can accurately measure
  const filteredRequested = filteredSuccessful // Best estimate available
  const filteredFailures = 0 // Can't calculate without jobs table

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
