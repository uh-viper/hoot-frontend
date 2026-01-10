import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { initializeUserData } from '@/lib/api/user-initialization'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              request.cookies.set(name, value)
            )
          },
        },
      }
    )

    const { error, data } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // After email confirmation, ensure all user data rows exist
      // This handles cases where rows might be missing or were manually deleted
      // Note: initializeUserData will create its own client with the session cookies
      await initializeUserData(data.user.id)
      
      // Also sync the confirmed email to user_profiles table
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: data.user.id,
          email: data.user.email || null,
        }, {
          onConflict: 'user_id',
        })

      if (profileError) {
        // Log but don't fail - email is already confirmed in auth
        console.error('Failed to sync email to user_profiles:', profileError)
      }

      // Redirect to our custom confirmation success page
      const confirmPageUrl = new URL('/auth/confirm', requestUrl.origin)
      confirmPageUrl.searchParams.set('success', 'true')
      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      
      if (isLocalEnv) {
        return NextResponse.redirect(confirmPageUrl)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${confirmPageUrl.pathname}${confirmPageUrl.search}`)
      } else {
        return NextResponse.redirect(confirmPageUrl)
      }
    }
  }

  // If there's an error, redirect to login with error message
  const loginUrl = new URL('/login', requestUrl.origin)
  loginUrl.searchParams.set('error', 'Email confirmation failed. Please try again.')
  return NextResponse.redirect(loginUrl)
}
