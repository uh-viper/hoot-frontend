'use server'

import { getSessionUser } from '@/lib/auth/validate-session'
import { isAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'

export interface UpdateCreditsResult {
  success: boolean
  error?: string
  newBalance?: number
}

/**
 * Admin-only function to add or deduct credits for a user
 * @param targetUserId - The user ID to update credits for
 * @param amount - Positive number to add, negative number to deduct
 */
export async function updateUserCredits(
  targetUserId: string,
  amount: number
): Promise<UpdateCreditsResult> {
  // Verify current user is admin
  const currentUser = await getSessionUser()
  if (!currentUser) {
    return { success: false, error: 'Not authenticated' }
  }

  const userIsAdmin = await isAdmin()
  if (!userIsAdmin) {
    return { success: false, error: 'Unauthorized - Admin access required' }
  }

  // Validate input
  if (!targetUserId || typeof targetUserId !== 'string') {
    return { success: false, error: 'Invalid user ID' }
  }

  if (typeof amount !== 'number' || amount === 0) {
    return { success: false, error: 'Amount must be a non-zero number' }
  }

  const supabase = await createClient()

  try {
    // Get current credits
    const { data: currentCredits, error: fetchError } = await supabase
      .from('user_credits')
      .select('credits')
      .eq('user_id', targetUserId)
      .single()

    if (fetchError || !currentCredits) {
      return { success: false, error: 'User credits not found' }
    }

    const currentBalance = currentCredits.credits ?? 0
    const newBalance = currentBalance + amount

    // Prevent negative balance
    if (newBalance < 0) {
      return {
        success: false,
        error: `Cannot deduct ${Math.abs(amount)} credits. User only has ${currentBalance} credits.`,
      }
    }

    // Update credits
    const { data: updatedCredits, error: updateError } = await supabase
      .from('user_credits')
      .update({ credits: newBalance })
      .eq('user_id', targetUserId)
      .select('credits')
      .single()

    if (updateError || !updatedCredits) {
      console.error('Error updating user credits:', updateError)
      return { success: false, error: 'Failed to update credits' }
    }

    // Log the action to server console for audit trail
    console.log(`[ADMIN] ${currentUser.id} ${amount > 0 ? 'added' : 'deducted'} ${Math.abs(amount)} credits for user ${targetUserId}. New balance: ${newBalance}`)

    return {
      success: true,
      newBalance: updatedCredits.credits,
    }
  } catch (error) {
    console.error('Unexpected error updating user credits:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update credits',
    }
  }
}

export interface GrantCreditsToAllResult {
  success: boolean
  error?: string
  usersUpdated?: number
  totalCreditsGranted?: number
}

/**
 * Admin-only function to grant credits to all users
 * @param amount - Positive number of credits to grant to each user
 */
export async function grantCreditsToAll(
  amount: number
): Promise<GrantCreditsToAllResult> {
  // Verify current user is admin
  const currentUser = await getSessionUser()
  if (!currentUser) {
    return { success: false, error: 'Not authenticated' }
  }

  const userIsAdmin = await isAdmin()
  if (!userIsAdmin) {
    return { success: false, error: 'Unauthorized - Admin access required' }
  }

  // Validate input
  if (typeof amount !== 'number' || amount <= 0) {
    return { success: false, error: 'Amount must be a positive number' }
  }

  const supabase = await createClient()

  try {
    // Get all users with credits
    const { data: allCredits, error: fetchError } = await supabase
      .from('user_credits')
      .select('user_id, credits')

    if (fetchError) {
      console.error('Error fetching user credits:', fetchError)
      return { success: false, error: 'Failed to fetch user credits' }
    }

    if (!allCredits || allCredits.length === 0) {
      return { success: false, error: 'No users found' }
    }

    // Update all users' credits
    let usersUpdated = 0
    let totalCreditsGranted = 0

    for (const creditRecord of allCredits) {
      const currentBalance = creditRecord.credits ?? 0
      const newBalance = currentBalance + amount

      const { error: updateError } = await supabase
        .from('user_credits')
        .update({ credits: newBalance })
        .eq('user_id', creditRecord.user_id)

      if (updateError) {
        console.error(`Error updating credits for user ${creditRecord.user_id}:`, updateError)
        // Continue with other users even if one fails
        continue
      }

      usersUpdated++
      totalCreditsGranted += amount
    }

    // Log the action to server console for audit trail
    console.log(`[ADMIN] ${currentUser.id} granted ${amount} credits to all ${usersUpdated} users. Total credits granted: ${totalCreditsGranted}`)

    return {
      success: true,
      usersUpdated,
      totalCreditsGranted,
    }
  } catch (error) {
    console.error('Unexpected error granting credits to all users:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to grant credits',
    }
  }
}
