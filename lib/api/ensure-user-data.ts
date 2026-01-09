import { createClient } from '@/lib/supabase/server'

/**
 * Ensures user has credits and stats rows, creating them if they don't exist
 * This is useful for existing users who signed up before the tables were created
 */
export async function ensureUserData(userId: string) {
  const supabase = await createClient()

  try {
    // Check and create credits if needed
    const { data: creditsData, error: creditsError } = await supabase
      .from('user_credits')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (creditsError && creditsError.code === 'PGRST116') {
      // Credits don't exist, create them
      const { error: insertCreditsError } = await supabase
        .from('user_credits')
        .insert({
          user_id: userId,
          credits: 0,
        })

      if (insertCreditsError) {
        console.error('Error creating user credits:', insertCreditsError)
      }
    }

    // Check and create stats if needed
    const { data: statsData, error: statsError } = await supabase
      .from('user_stats')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (statsError && statsError.code === 'PGRST116') {
      // Stats don't exist, create them
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
        console.error('Error creating user stats:', insertStatsError)
      }
    }
  } catch (error) {
    console.error('Unexpected error ensuring user data:', error)
  }
}
