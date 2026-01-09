import { createClient } from '@/lib/supabase/server'

/**
 * Ensures a user has both credits and stats rows initialized.
 * This is called after signup to guarantee data exists.
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
    if (creditsError && creditsError.code === 'PGRST116') {
      const { error: insertCreditsError } = await supabase
        .from('user_credits')
        .insert({
          user_id: userId,
          credits: 0,
        })

      if (insertCreditsError) {
        console.error('Error initializing user credits:', insertCreditsError)
        return { success: false, error: insertCreditsError.message }
      }
    }

    // Check if user_stats exists
    const { data: statsData, error: statsError } = await supabase
      .from('user_stats')
      .select('id')
      .eq('user_id', userId)
      .single()

    // Create stats if they don't exist
    if (statsError && statsError.code === 'PGRST116') {
      const { error: insertStatsError } = await supabase
        .from('user_stats')
        .insert({
          user_id: userId,
          business_centers: 0,
          requested: 0,
          successful: 0,
          failures: 0,
        })

      if (insertStatsError) {
        console.error('Error initializing user stats:', insertStatsError)
        return { success: false, error: insertStatsError.message }
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error initializing user data:', error)
    return { success: false, error: 'Failed to initialize user data' }
  }
}
