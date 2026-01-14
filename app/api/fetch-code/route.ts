import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/validate-session'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/api/rate-limit'

const WORKER_URL = 'https://bc-generator.capitaledge077.workers.dev'
const MAX_ATTEMPTS = 10 // Poll up to 10 times
const POLL_DELAY_MS = 2000 // 2 seconds between attempts

interface VerificationCodeResponse {
  found: boolean
  code?: string
  subject?: string
  from?: string
}

/**
 * Fetch verification code from Cloudflare Worker
 * Secured: Only allows users to fetch codes for their own accounts
 */
export async function POST(request: NextRequest) {
  try {
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

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      )
    }

    // Verify account ownership - SECURITY CHECK
    const supabase = await createClient()
    const { data: account, error: accountError } = await supabase
      .from('user_accounts')
      .select('id, email, user_id')
      .eq('id', accountId)
      .eq('user_id', user.id) // Ensure account belongs to this user
      .single()

    if (accountError || !account) {
      return NextResponse.json(
        { error: 'Account not found or access denied' },
        { status: 403 }
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
