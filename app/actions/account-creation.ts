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
    console.log('[createJob] Creating job with:', { accounts, region, currency })
    const jobResponse = await createAccountsJob(accounts, region, currency, accessToken)
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
 * Save accounts to database after job completion
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
    // Insert accounts (if any)
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

      const { data, error } = await supabase
        .from('user_accounts')
        .insert(accountsToInsert)
        .select()

      if (error) {
        console.error('Failed to save accounts:', error)
        return { success: false, error: error.message }
      }

      savedCount = data?.length ?? 0
    }

    // Update user stats (including failures)
    const { data: statsData } = await supabase
      .from('user_stats')
      .select('business_centers, successful, failures')
      .eq('user_id', user.id)
      .single()

    if (statsData) {
      await supabase
        .from('user_stats')
        .update({
          business_centers: (statsData.business_centers ?? 0) + savedCount,
          successful: (statsData.successful ?? 0) + savedCount,
          failures: (statsData.failures ?? 0) + failedCount,
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
