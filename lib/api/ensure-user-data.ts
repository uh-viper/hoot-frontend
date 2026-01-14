import { createClient } from '@/lib/supabase/server'

/**
 * Ensures user has credits row, creating it if it doesn't exist
 * This is useful for existing users who signed up before the table was created
 * Note: user_jobs are created when jobs are submitted, no initialization needed
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

    // user_stats removed - stats are now calculated from user_jobs table
    // No initialization needed for user_jobs (jobs are created when user creates them)
  } catch (error) {
    console.error('Unexpected error ensuring user data:', error)
  }
}
