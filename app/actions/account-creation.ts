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
    // CRITICAL: Must use session.access_token from supabase.auth.getSession()
    // In server actions with SSR, getSession should work with cookies
    console.log('[createJob] Getting Supabase session...')
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('[createJob] Session error:', sessionError)
      return { success: false, error: 'Authentication error. Please log in again.' }
    }
    
    if (!session) {
      console.error('[createJob] No session returned from getSession()')
      return { success: false, error: 'No active session. Please log in again.' }
    }
    
    // CRITICAL: Use session.access_token - this is the Supabase Auth JWT token
    // Do NOT use any other token source
    if (!session.access_token) {
      console.error('[createJob] Session exists but has no access_token')
      // Try refreshing the session
      console.log('[createJob] Attempting to refresh session...')
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
      
      if (refreshError || !refreshedSession?.access_token) {
        console.error('[createJob] Refresh error:', refreshError)
        return { success: false, error: 'Authentication error. Please log in again.' }
      }
      
      // Use refreshed session token
      session.access_token = refreshedSession.access_token
    }
    
    let accessToken = session.access_token
    
    // Verify this is actually a Supabase token by checking session type
    console.log('[createJob] Session token_type:', session.token_type || 'not specified')
    console.log('[createJob] Session user ID:', session.user?.id || 'not in session')
    
    if (!accessToken) {
      console.error('[createJob] No valid access token available')
      return { success: false, error: 'Authentication required. Please log in again.' }
    }
    
    // Validate token format
    if (typeof accessToken !== 'string' || accessToken.split('.').length !== 3) {
      console.error('[createJob] Invalid token format - not a valid JWT');
      return { success: false, error: 'Invalid authentication token. Please log in again.' }
    }
    
    // Decode JWT header to verify algorithm (should be HS256 for Supabase)
    try {
      const tokenParts = accessToken.split('.');
      if (tokenParts.length >= 1) {
        // Decode base64url header (Node.js Buffer supports base64url in newer versions)
        const headerBase64 = tokenParts[0].replace(/-/g, '+').replace(/_/g, '/');
        const headerJson = Buffer.from(headerBase64, 'base64').toString('utf-8');
        const header = JSON.parse(headerJson);
        
        console.log('[createJob] Token algorithm:', header.alg);
        console.log('[createJob] Token type:', header.typ || 'not in header');
        
        // Log token algorithm for debugging
        // Note: Supabase now uses ES256 (ECC P-256) by default for new projects
        // Legacy projects may still use HS256
        if (header.alg) {
          console.log(`[createJob] Token algorithm: ${header.alg} (${header.alg === 'HS256' ? 'Legacy' : 'Modern'})`);
        }
        
        // Note: We don't reject ES256 tokens here - Supabase uses ES256 by default now
        // The backend must be configured to validate ES256 tokens using Supabase's JWKS endpoint:
        // https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json
      }
    } catch (e) {
      console.warn('[createJob] Could not decode token header:', e);
      // Continue anyway - let the backend validate
    }
    
    console.log('[createJob] Successfully retrieved access token (JWT format verified)')

    // Create job via backend API
    // NOTE: Credits are NOT deducted here - they will be deducted when accounts are actually saved
    console.log('[createJob] Creating job with:', { accounts, region, currency })
    const jobResponse = await createAccountsJob(accounts, region, currency, accessToken)
    console.log('[createJob] Job created successfully:', jobResponse)

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
    // Try getSession first, if that fails try refreshing the session
    let session = (await supabase.auth.getSession()).data.session
    
    // If no session, try refreshing
    if (!session) {
      const { data: { session: refreshedSession } } = await supabase.auth.refreshSession()
      session = refreshedSession
    }
    
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
 * Update user stats incrementally (for real-time updates)
 */
export async function updateUserStatsIncremental(
  accountsCreated: number = 0,
  failures: number = 0
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  try {
    const { data: statsData } = await supabase
      .from('user_stats')
      .select('successful, failures')
      .eq('user_id', user.id)
      .single()

    if (statsData) {
      await supabase
        .from('user_stats')
        .update({
          successful: (statsData.successful ?? 0) + accountsCreated,
          failures: (statsData.failures ?? 0) + failures,
        })
        .eq('user_id', user.id)
    } else {
      // Stats don't exist - create them
      await supabase
        .from('user_stats')
        .insert({
          user_id: user.id,
          successful: accountsCreated,
          failures: failures,
          requested: 0,
        })
    }

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Failed to update user stats:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update stats',
    }
  }
}

/**
 * Save accounts to database after job completion
 * Credits are deducted here based on actual accounts saved (1 BC = 1 credit)
 * Note: Stats are updated in real-time as accounts/failures happen, so we don't update them here
 * to avoid double-counting. This function saves accounts and deducts credits.
 */
export async function saveAccounts(
  jobId: string,
  accounts: Array<{ email: string; password: string }>,
  region: string,
  currency: string,
  failedCount: number = 0
): Promise<{ success: boolean; error?: string; savedCount?: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Allow saving even if no accounts (to update failures count)
  // But require accounts array to be provided (can be empty)
  if (!accounts) {
    return { success: false, error: 'Invalid accounts data' }
  }

  try {
    // Check if accounts from this job_id already exist to prevent double credit deduction
    const { count: existingAccountsCount } = await supabase
      .from('user_accounts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('job_id', jobId)

    const accountsAlreadySaved = (existingAccountsCount ?? 0) > 0

    // Insert accounts (if any) - use upsert to handle duplicates gracefully
    let savedCount = 0

    if (accounts.length > 0) {
      const accountsToInsert = accounts.map((account) => ({
        user_id: user.id,
        job_id: jobId,
        email: account.email,
        password: account.password,
        region,
        currency,
      }))

      // Use upsert to handle duplicates - update if exists, insert if not
      const { data, error } = await supabase
        .from('user_accounts')
        .upsert(accountsToInsert, {
          onConflict: 'user_id,email',
          ignoreDuplicates: false
        })
        .select()

      if (error) {
        console.error('Failed to save accounts:', error)
        // If it's a duplicate key error, that's okay - account already exists
        if (error.code === '23505' || error.message.includes('duplicate key')) {
          console.log('Some accounts already exist, continuing...')
          // Check how many accounts from this job_id now exist
          const { count: finalCount } = await supabase
            .from('user_accounts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('job_id', jobId)
          
          savedCount = finalCount ?? 0
        } else {
          return { success: false, error: error.message }
        }
      } else {
        savedCount = data?.length ?? 0
      }
    }

    // Deduct credits ONLY for newly saved accounts (1 BC = 1 credit)
    // Only deduct if this is the first time saving accounts from this job_id
    // Deduct based on actual number of accounts saved
    if (!accountsAlreadySaved && savedCount > 0) {
      console.log(`[saveAccounts] Deducting ${savedCount} credits for ${savedCount} accounts saved`)
      const { error: deductError } = await supabase.rpc('deduct_credits_from_user', {
        p_user_id: user.id,
        p_credits_to_deduct: savedCount,
      })

      if (deductError) {
        console.error('[saveAccounts] Failed to deduct credits:', deductError)
        // Don't fail the save operation, but log the error
        // In production, you might want to handle this differently
        console.warn('[saveAccounts] Accounts were saved but credits were not deducted. Manual intervention may be required.')
      } else {
        console.log(`[saveAccounts] Successfully deducted ${savedCount} credits`)
      }
    } else if (accountsAlreadySaved) {
      console.log('[saveAccounts] Accounts from this job_id already exist - skipping credit deduction to prevent double charge')
    } else if (savedCount === 0) {
      console.log('[saveAccounts] No accounts were saved - skipping credit deduction')
    }

    // Note: Stats are updated in real-time via updateUserStatsIncremental()
    // as accounts/failures happen, so we don't update them here to avoid double-counting.
    // This function saves accounts and deducts credits.

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
