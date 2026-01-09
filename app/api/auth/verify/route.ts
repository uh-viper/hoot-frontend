import { NextRequest, NextResponse } from 'next/server'
import { validateSession } from '@/lib/auth/validate-session'
import { rateLimit } from '@/lib/api/rate-limit'

/**
 * Secure API route example - Verifies user session
 * All API routes should follow this pattern
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = rateLimit(request)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: rateLimitResult.message },
      { status: 429 }
    )
  }

  try {
    const { user } = await validateSession()
    
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
      }
    })
  } catch (error) {
    if (error instanceof Response) {
      return error
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
