'use server'

import { createClient } from '@/lib/supabase/server'
import { getSessionUser } from './validate-session'
import { redirect } from 'next/navigation'

/**
 * Checks if the current authenticated user is an admin
 * Returns true if admin, false otherwise
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getSessionUser()
  
  if (!user) {
    return false
  }

  const supabase = await createClient()
  
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()

  if (error || !profile) {
    return false
  }

  return profile.is_admin === true
}

/**
 * Validates that the current user is an admin
 * Throws redirect to dashboard if not admin
 * Useful for server components
 */
export async function requireAdmin() {
  const isUserAdmin = await isAdmin()
  
  if (!isUserAdmin) {
    redirect('/dashboard')
  }
}

/**
 * Validates that the current user is an admin
 * Returns error response if not admin
 * Useful for API routes
 */
export async function validateAdmin() {
  const user = await getSessionUser()
  
  if (!user) {
    return {
      error: 'Unauthorized',
      message: 'Authentication required'
    }
  }

  const supabase = await createClient()
  
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()

  if (error || !profile || !profile.is_admin) {
    return {
      error: 'Forbidden',
      message: 'Admin access required'
    }
  }

  return { user, supabase }
}
