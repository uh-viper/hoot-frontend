import { createClient } from '@/lib/supabase/server'

/**
 * Ensures a user has credits, stats, and profile rows initialized.
 * This is called after signup and on dashboard access to guarantee data exists.
 * IMPORTANT: When adding new tables in the future, update this function to ensure
 * all existing users get entries created.
 */
export async function initializeUserData(userId: string) {
  const supabase = await createClient()

  try {
    // Check if user_credits exists
    const { data: creditsData, error: creditsError } = await supabase
      .from('user_credits')
      .select('id')
      .eq('user_id', userId)
      .single()

    // Create credits if they don't exist
    // Use RPC function directly to bypass RLS (more reliable than direct insert)
    if (creditsError && creditsError.code === 'PGRST116') {
      const { error: rpcError } = await supabase.rpc('ensure_user_credits', {
        p_user_id: userId,
      })

      if (rpcError) {
        console.error('Error initializing user credits:', rpcError)
        return { success: false, error: rpcError.message }
      }
    }

    // Check if user_stats exists
    const { data: statsData, error: statsError } = await supabase
      .from('user_stats')
      .select('id')
      .eq('user_id', userId)
      .single()

    // Create stats if they don't exist
    // Use RPC function directly to bypass RLS (more reliable than direct insert)
    if (statsError && statsError.code === 'PGRST116') {
      const { error: rpcError } = await supabase.rpc('ensure_user_stats', {
        p_user_id: userId,
      })

      if (rpcError) {
        console.error('Error initializing user stats:', rpcError)
        return { success: false, error: rpcError.message }
      }
    }

    // Check if user_profiles exists
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', userId)
      .single()

    // Create profile if it doesn't exist
    if (profileError && profileError.code === 'PGRST116') {
      // Get user metadata to populate profile
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Try direct insert first (should work for current user due to RLS INSERT policy)
        const { error: insertProfileError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: userId,
            full_name: user.user_metadata?.full_name || null,
            email: user.email || null,
            discord_username: user.user_metadata?.discord_username || null,
          })

        // If direct insert fails (RLS issue), try RPC function (bypasses RLS)
        if (insertProfileError) {
          const { error: rpcError } = await supabase.rpc('ensure_user_profile', {
            user_uuid: userId,
          })

          if (rpcError) {
            console.error('Error initializing user profile (both methods failed):', {
              insertError: insertProfileError,
              rpcError: rpcError,
            })
            return { success: false, error: insertProfileError.message }
          }
        }
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error initializing user data:', error)
    return { success: false, error: 'Failed to initialize user data' }
  }
}
