import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/validate-session'
import { createClient } from '@/lib/supabase/server'

// Get backend API URL from environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://3.227.169.47:8081'
const TIMEOUT_MS = 90000 // 90 seconds total timeout
const POLL_INTERVAL_MS = 2000 // 2 seconds between attempts

interface VerificationCodeResponse {
  found: boolean
  code?: string | null
  subject?: string
  type?: string
  to?: string
  timestamp?: number
  receivedAt?: string
}

/**
 * Fetch verification code from Backend API
 * 
 * SECURITY:
 * - Only allows users to fetch codes for their own accounts (verified via user_id)
 * - Uses JWT authentication (Supabase token) for backend API
 * - UUID validation prevents injection attacks
 * - Generic error messages prevent information leakage
 * - All requests require authentication
 * - Email is URL-encoded to prevent injection
 */
export async function POST(request: NextRequest) {
  try {
    // Validate session and get JWT token
    const user = await getSessionUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get JWT token from Supabase session
    const supabase = await createClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.access_token) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      )
    }

    const jwtToken = session.access_token

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

    // Poll backend API for verification code (up to 90 seconds)
    const startTime = Date.now()
    let attempt = 0

    while (Date.now() - startTime < TIMEOUT_MS) {
      attempt++
      
      try {
        // Create abort controller for timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout per request

        try {
          // SECURITY: Email is URL-encoded to prevent injection
          // Only emails from user's own accounts are queried (verified above)
          const response = await fetch(
            `${API_BASE_URL}/api/get-code?email=${encodeURIComponent(account.email)}`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${jwtToken}`,
                'Content-Type': 'application/json',
              },
              signal: controller.signal,
            }
          )

          clearTimeout(timeoutId)

          // Handle 401 Unauthorized
          if (response.status === 401) {
            return NextResponse.json(
              { error: 'Unauthorized - authentication failed' },
              { status: 401 }
            )
          }

          // Handle 400 Bad Request
          if (response.status === 400) {
            const errorData = await response.json().catch(() => ({}))
            return NextResponse.json(
              { error: errorData.error || 'Bad request' },
              { status: 400 }
            )
          }

          if (response.ok) {
            const data: VerificationCodeResponse = await response.json()

            // If code is found, return immediately
            if (data.found && data.code) {
              return NextResponse.json({
                success: true,
                code: data.code,
                attempts: attempt,
              })
            }
            // If found: false, continue polling
          } else {
            // Non-200 status, log but continue polling
            console.warn(`Backend API returned status ${response.status}, continuing to poll...`)
          }
        } catch (fetchError: any) {
          clearTimeout(timeoutId)
          // AbortError is expected on timeout, continue polling
          if (fetchError.name !== 'AbortError') {
            console.warn(`Error fetching code (attempt ${attempt}):`, fetchError)
          }
        }
      } catch (error) {
        // Network errors are okay, continue polling
        console.warn(`Network error (attempt ${attempt}):`, error)
      }

      // Wait before next attempt
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
    }

    // No code found after timeout
    return NextResponse.json(
      {
        success: false,
        error: 'Verification code not found after 90 seconds',
        attempts: attempt,
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
