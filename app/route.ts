import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  // If there's a code parameter, redirect to our callback handler
  if (code) {
    const callbackUrl = new URL('/auth/callback', requestUrl.origin)
    callbackUrl.searchParams.set('code', code)
    return NextResponse.redirect(callbackUrl)
  }

  // Otherwise, redirect to home
  return NextResponse.redirect(new URL('/', requestUrl.origin))
}
