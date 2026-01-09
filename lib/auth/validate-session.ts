import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Validates user session for API routes
 * Returns user data if authenticated, throws redirect if not
 */
export async function validateSession() {
  const supabase = await createClient()
  
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Response(
      JSON.stringify({ 
        error: 'Unauthorized',
        message: 'Authentication required' 
      }),
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  return { user, supabase }
}

/**
 * Validates session and returns user without throwing
 * Useful for client components that need to handle auth state
 */
export async function getSessionUser() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}
