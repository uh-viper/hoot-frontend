import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/validate-session'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/api/rate-limit'

// Get worker URL from environment variable (server-side only)
const WORKER_URL = process.env.EMAIL_FETCHER
const MAX_ATTEMPTS = 3 // Poll up to 3 times
const POLL_DELAY_MS = 2000 // 2 seconds between attempts

interface VerificationCodeResponse {
  found: boolean
  code?: string
  subject?: string
  from?: string
}

/**
 * Fetch verification code from Cloudflare Worker
 * 
 * SECURITY:
 * - Only allows users to fetch codes for their own accounts (verified via user_id)
 * - Worker URL stored in server-side environment variable (EMAIL_FETCHER)
 * - Rate limiting prevents abuse
 * - UUID validation prevents injection attacks
 * - Generic error messages prevent information leakage
 * - All requests require authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Validate environment variable is set
    if (!WORKER_URL) {
      console.error('EMAIL_FETCHER environment variable is not set')
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      )
    }

    // Rate limiting
    const rateLimitResult = rateLimit(request)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: rateLimitResult.message || 'Too many requests' },
        { status: 429 }
      )
    }

    // Validate session
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { accountId } = body

    // Validate accountId exists and is a valid UUID format
    if (!accountId || typeof accountId !== 'string' || accountId.trim() === '') {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      )
    }

    // Validate UUID format to prevent injection attacks
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(accountId.trim())) {
      return NextResponse.json(
        { error: 'Invalid account ID format' },
        { status: 400 }
      )
    }

    // Verify account ownership - CRITICAL SECURITY CHECK
    // Users can ONLY fetch codes for accounts they own
    const supabase = await createClient()
    const { data: account, error: accountError } = await supabase
      .from('user_accounts')
      .select('id, email, user_id')
      .eq('id', accountId)
      .eq('user_id', user.id) // CRITICAL: Ensure account belongs to this user
      .single()

    if (accountError || !account) {
      // Don't expose whether account exists or not - generic error
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Additional validation: ensure email is not empty
    if (!account.email || account.email.trim() === '') {
      return NextResponse.json(
        { error: 'Invalid account' },
        { status: 400 }
      )
    }

    // Fetch verification code from Cloudflare Worker
    // Poll for up to MAX_ATTEMPTS times to get the most recent code
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout per request

        try {
          // SECURITY: Email is URL-encoded to prevent injection
          // Only emails from user's own accounts are queried (verified above)
          const response = await fetch(
            `${WORKER_URL}/api/get-code?email=${encodeURIComponent(account.email)}`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
              signal: controller.signal,
            }
          )

          clearTimeout(timeoutId)

          if (response.ok) {
            const data: VerificationCodeResponse = await response.json()

            // If code is found, return immediately (it's the most recent)
            if (data.found && data.code) {
              return NextResponse.json({
                success: true,
                code: data.code,
                attempts: attempt,
              })
            }
          }
        } catch (fetchError: any) {
          clearTimeout(timeoutId)
          // AbortError is expected on timeout, continue polling
          if (fetchError.name !== 'AbortError') {
            throw fetchError
          }
        }
      } catch (error) {
        // Network errors are okay, continue polling
        if (attempt === MAX_ATTEMPTS) {
          console.error(`Error fetching code (final attempt ${attempt}/${MAX_ATTEMPTS}):`, error)
        }
      }

      // Wait before next attempt (except on last attempt)
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, POLL_DELAY_MS))
      }
    }

    // No code found after all attempts
    return NextResponse.json(
      {
        success: false,
        error: 'Verification code not found after multiple attempts',
        attempts: MAX_ATTEMPTS,
      },
      { status: 404 }
    )
  } catch (error) {
    console.error('Unexpected error in POST /api/fetch-code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
