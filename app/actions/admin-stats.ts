'use server'

import { createClient } from '@/lib/supabase/server'
import { validateAdmin } from '@/lib/auth/admin'

export async function getFilteredStats(startDate: Date, endDate: Date) {
  // Check if user is admin
  const adminCheck = await validateAdmin()
  if (adminCheck.error) {
    return { error: adminCheck.error, message: adminCheck.message }
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

  // Fetch user accounts for successful/failed counts in date range
  // Note: We can't easily filter user_stats by date, so we'll count from user_accounts
  const { data: filteredAccounts } = await supabase
    .from('user_accounts')
    .select('created_at')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())

  const filteredSuccessful = filteredAccounts?.length ?? 0

  // For failures, we'd need to query failed jobs - this is a simplified version
  // In a real implementation, you'd query a jobs table or similar

  return {
    businessCenters: filteredBCs ?? 0,
    creditsIssued: filteredCreditsIssued,
    revenue: filteredRevenue,
    successful: filteredSuccessful,
    purchases: filteredPurchases?.length ?? 0,
  }
}
