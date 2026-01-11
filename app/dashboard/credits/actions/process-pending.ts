'use server'

import { createClient } from '@supabase/supabase-js'

// Use service role key to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export async function processPendingPurchases(userId: string): Promise<{
  processed: number
  creditsAdded: number
  errors: string[]
}> {
  const errors: string[] = []
  let processed = 0
  let creditsAdded = 0

  try {
    // Get all pending purchases for this user
    const { data: pendingPurchases, error: fetchError } = await supabaseAdmin
      .from('purchases')
      .select('id, user_id, credits, status')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error('Error fetching pending purchases:', fetchError)
      errors.push('Failed to fetch pending purchases')
      return { processed, creditsAdded, errors }
    }

    if (!pendingPurchases || pendingPurchases.length === 0) {
      return { processed, creditsAdded, errors }
    }

    console.log(`Processing ${pendingPurchases.length} pending purchases for user ${userId}`)

    for (const purchase of pendingPurchases) {
      try {
        // Call add_credits_to_user function
        const { error: addCreditsError } = await supabaseAdmin.rpc('add_credits_to_user', {
          p_user_id: purchase.user_id,
          p_credits: purchase.credits,
          p_purchase_id: purchase.id,
          p_payment_intent_id: null,
        })

        if (addCreditsError) {
          console.error(`Failed to process purchase ${purchase.id}:`, addCreditsError)
          errors.push(`Purchase ${purchase.id}: ${addCreditsError.message}`)
        } else {
          processed++
          creditsAdded += purchase.credits
          console.log(`✅ Processed purchase ${purchase.id} - Added ${purchase.credits} credits`)
        }
      } catch (err: any) {
        console.error(`Exception processing purchase ${purchase.id}:`, err)
        errors.push(`Purchase ${purchase.id}: ${err.message}`)
      }
    }

    return { processed, creditsAdded, errors }
  } catch (error: any) {
    console.error('Error in processPendingPurchases:', error)
    errors.push(error.message)
    return { processed, creditsAdded, errors }
  }
}
