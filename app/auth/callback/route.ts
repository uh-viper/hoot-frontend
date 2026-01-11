import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { initializeUserData } from '@/lib/api/user-initialization'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  if (code) {
    let supabaseResponse = NextResponse.next({
      request,
    })

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
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { error, data } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Handle password recovery flow
      // Check if this is a password recovery by looking at next parameter or type parameter
      // Supabase password reset codes have type=recovery in the verify URL but it doesn't get passed to callback
      // So we check the next parameter to detect password reset flow
      if (type === 'recovery' || next === '/reset-password') {
        // For password reset, redirect to reset password page (without code, session is already set)
        const resetUrl = new URL('/reset-password', requestUrl.origin)
        const forwardedHost = request.headers.get('x-forwarded-host')
        const isLocalEnv = process.env.NODE_ENV === 'development'
        
        // Create redirect response
        const redirectResponse = isLocalEnv 
          ? NextResponse.redirect(resetUrl)
          : forwardedHost 
            ? NextResponse.redirect(`https://${forwardedHost}${resetUrl.pathname}`)
            : NextResponse.redirect(resetUrl)
        
        // Copy cookies from supabaseResponse to redirectResponse
        supabaseResponse.cookies.getAll().forEach((cookie) => {
          redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
        })
        
        return redirectResponse
      }
      
      // If no type or next indicates recovery, but the code was from password reset,
      // Supabase might still redirect here - check if we should go to reset password
      // by checking if the user was redirected here without email confirmation flow
      // For now, we'll rely on next parameter to detect password reset

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
  loginUrl.searchParams.set('error', 'Authentication failed. Please try again.')
  return NextResponse.redirect(loginUrl)
}
