'use server'

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { createClient } from '@/lib/supabase/server'
import { validateAdmin } from '@/lib/auth/admin'

// Extend dayjs with plugins
dayjs.extend(utc)
dayjs.extend(timezone)

export async function getFilteredStats(
  startDate: Date | null, 
  endDate: Date | null,
  referralCode?: string
) {
  // Check if user is admin
  const adminCheck = await validateAdmin()
  if (adminCheck.error || !adminCheck.supabase) {
    return { error: adminCheck.error || 'Forbidden', message: adminCheck.message || 'Admin access required' }
  }

  const supabase = adminCheck.supabase

  // Convert dates to ISO strings if provided
  const start = startDate ? dayjs(startDate).utc().toISOString() : null
  const end = endDate ? dayjs(endDate).utc().toISOString() : null

  // If filtering by referral code, get the user IDs with that referral code (case-insensitive)
  let referralUserIds: string[] | null = null
  if (referralCode) {
    // Normalize referral code (case-insensitive input)
    const normalizedReferralCode = referralCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    
    // Query directly since codes are stored uppercase in DB
    const { data: referralUsers } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('referral_code', normalizedReferralCode)

    referralUserIds = referralUsers?.map(u => u.user_id) || []
    
    // If no users found with this referral code, return zeros
    if (referralUserIds.length === 0) {
      return {
        requested: 0,
        successful: 0,
        failures: 0,
        businessCenters: 0,
        creditsIssued: 0,
        revenue: 0,
        purchases: 0,
        totalUsers: 0,
      }
    }
  }

  // Get total users count (filtered by referral code if specified, case-insensitive)
  let totalUsers = 0
  if (referralCode) {
    // Normalize referral code (case-insensitive input)
    const normalizedReferralCode = referralCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    // Query directly since codes are stored uppercase in DB
    const { count } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('referral_code', normalizedReferralCode)
    totalUsers = count || 0
  } else {
    const { count } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
    totalUsers = count || 0
  }

  // Build accounts query
  let accountsQuery = supabase
    .from('user_accounts')
    .select('*', { count: 'exact', head: true })
  
  if (start && end) {
    accountsQuery = accountsQuery.gte('created_at', start).lte('created_at', end)
  }
  if (referralUserIds) {
    accountsQuery = accountsQuery.in('user_id', referralUserIds)
  }
  
  const { count: filteredBCs } = await accountsQuery

  // Build purchases query
  let purchasesQuery = supabase
    .from('purchases')
    .select('credits, amount_paid_cents, status')
  
  if (start && end) {
    purchasesQuery = purchasesQuery.gte('created_at', start).lte('created_at', end)
  }
  if (referralUserIds) {
    purchasesQuery = purchasesQuery.in('user_id', referralUserIds)
  }
  
  const { data: filteredPurchases } = await purchasesQuery

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

  // Build user_jobs query
  let jobsQuery = supabase
    .from('user_jobs')
    .select('requested_count, successful_count, failed_count')
  
  if (start && end) {
    jobsQuery = jobsQuery.gte('created_at', start).lte('created_at', end)
  }
  if (referralUserIds) {
    jobsQuery = jobsQuery.in('user_id', referralUserIds)
  }
  
  const { data: jobsInRange } = await jobsQuery

  // Sum up the stats from jobs
  const filteredRequested = jobsInRange?.reduce((sum, job) => sum + (job.requested_count || 0), 0) ?? 0
  const filteredSuccessful = jobsInRange?.reduce((sum, job) => sum + (job.successful_count || 0), 0) ?? 0
  const filteredFailures = jobsInRange?.reduce((sum, job) => sum + (job.failed_count || 0), 0) ?? 0

  return {
    requested: filteredRequested,
    successful: filteredSuccessful,
    failures: filteredFailures,
    businessCenters: filteredBCs ?? 0,
    creditsIssued: filteredCreditsIssued,
    revenue: filteredRevenue,
    purchases: filteredPurchases?.length ?? 0,
    totalUsers: totalUsers ?? 0,
  }
}
