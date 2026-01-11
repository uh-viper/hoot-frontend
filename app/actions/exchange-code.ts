'use server'

import { createClient } from '@/lib/supabase/server'

export async function exchangeCodeForSession(code: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  
  if (error) {
    console.error('Exchange code error:', error)
    return { error: error.message }
  }
  
  if (data.session) {
    // Log session info for debugging
    console.log('Session AMR:', (data.session as any).amr)
    console.log('User recovery_sent_at:', data.user?.recovery_sent_at)
    
    return { success: true, user: data.user }
  }
  
  return { error: 'Failed to create session' }
}
