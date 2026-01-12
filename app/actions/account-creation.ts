'use server'

import { createClient } from '@/lib/supabase/server'
import { createAccountsJob, getJobStatus, type JobStatus } from '@/lib/api/backend-client'
import { revalidatePath } from 'next/cache'

export interface CheckCreditsResult {
  hasEnough: boolean
  currentCredits: number
  requiredCredits: number
  error?: string
}

/**
 * Check if user has enough credits for the requested number of accounts
 */
export async function checkCredits(accounts: number): Promise<CheckCreditsResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      hasEnough: false,
      currentCredits: 0,
      requiredCredits: accounts,
      error: 'Not authenticated',
    }
  }

  const { data: creditsData, error } = await supabase
    .from('user_credits')
    .select('credits')
    .eq('user_id', user.id)
    .single()

  if (error || !creditsData) {
    return {
      hasEnough: false,
      currentCredits: 0,
      requiredCredits: accounts,
      error: 'Failed to fetch credits',
    }
  }

  const currentCredits = creditsData.credits ?? 0
  const hasEnough = currentCredits >= accounts

  return {
    hasEnough,
    currentCredits,
    requiredCredits: accounts,
  }
}

/**
 * Create a new accounts job and deduct credits
 */
export async function createJob(
  accounts: number,
  region: string,
  currency: string
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Check credits first
  const creditsCheck = await checkCredits(accounts)
  if (!creditsCheck.hasEnough) {
    return {
      success: false,
      error: `Insufficient credits. You have ${creditsCheck.currentCredits} credits, but need ${creditsCheck.requiredCredits}.`,
    }
  }

  try {
    // Get JWT token from Supabase session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      return { success: false, error: 'Authentication required. Please log in again.' }
    }

    // Create job via backend API
    console.log('[createJob] Creating job with:', { accounts, region, currency })
    const jobResponse = await createAccountsJob(accounts, region, currency, session.access_token)
    console.log('[createJob] Job created successfully:', jobResponse)

    // Deduct credits from user using RPC function
    const { error: deductError } = await supabase.rpc('deduct_credits_from_user', {
      p_user_id: user.id,
      p_credits_to_deduct: accounts,
    })

    if (deductError) {
      console.error('Failed to deduct credits:', deductError)
      // Note: Job was created but credits weren't deducted
      // In production, you might want to cancel the job or handle this differently
      return {
        success: false,
        error: 'Job created but failed to deduct credits. Please contact support.',
      }
    }

    // Update user stats
    const { data: statsData } = await supabase
      .from('user_stats')
      .select('requested')
      .eq('user_id', user.id)
      .single()

    if (statsData) {
      await supabase
        .from('user_stats')
        .update({ requested: (statsData.requested ?? 0) + accounts })
        .eq('user_id', user.id)
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/creation')

    // Validate job was created successfully
    if (!jobResponse.success || !jobResponse.job_id) {
      return {
        success: false,
        error: jobResponse.error || 'Job creation failed - no job ID returned',
      }
    }

    return {
      success: true,
      jobId: jobResponse.job_id,
    }
  } catch (error) {
    console.error('Failed to create job:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create job',
    }
  }
}

/**
 * Get job status from backend API
 */
export async function fetchJobStatus(jobId: string): Promise<{ success: boolean; status?: JobStatus; error?: string }> {
  const supabase = await createClient()
  
  try {
    // Get JWT token from Supabase session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      return {
        success: false,
        error: 'Authentication required. Please log in again.',
      }
    }

    const status = await getJobStatus(jobId, session.access_token)
    // Log the status for debugging
    console.log('[fetchJobStatus] Job status response:', JSON.stringify(status, null, 2))
    return { success: true, status }
  } catch (error) {
    console.error('[fetchJobStatus] Failed to fetch job status:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch job status',
    }
  }
}

/**
 * Save accounts to database after job completion
 */
export async function saveAccounts(
  jobId: string,
  accounts: Array<{ email: string; password: string }>,
  region: string,
  currency: string
): Promise<{ success: boolean; error?: string; savedCount?: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  if (!accounts || accounts.length === 0) {
    return { success: false, error: 'No accounts to save' }
  }

  try {
    // Insert accounts
    const accountsToInsert = accounts.map((account) => ({
      user_id: user.id,
      job_id: jobId,
      email: account.email,
      password: account.password,
      region,
      currency,
    }))

    const { data, error } = await supabase
      .from('user_accounts')
      .insert(accountsToInsert)
      .select()

    if (error) {
      console.error('Failed to save accounts:', error)
      return { success: false, error: error.message }
    }

    // Update user stats
    const savedCount = data?.length ?? 0
    const { data: statsData } = await supabase
      .from('user_stats')
      .select('business_centers, successful')
      .eq('user_id', user.id)
      .single()

    if (statsData) {
      await supabase
        .from('user_stats')
        .update({
          business_centers: (statsData.business_centers ?? 0) + savedCount,
          successful: (statsData.successful ?? 0) + savedCount,
        })
        .eq('user_id', user.id)
    }

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/vault')

    return { success: true, savedCount }
  } catch (error) {
    console.error('Failed to save accounts:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save accounts',
    }
  }
}
