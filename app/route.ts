// This route handler only handles GET requests with a code parameter
// The page.tsx handles normal homepage requests
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  // Only handle if there's a code parameter (email confirmation)
  if (code) {
    const callbackUrl = new URL('/auth/callback', requestUrl.origin)
    callbackUrl.searchParams.set('code', code)
    return NextResponse.redirect(callbackUrl)
  }

  // For normal requests, let the page.tsx handle it
  return NextResponse.next()
}
