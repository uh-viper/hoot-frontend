'use server'

import { stripe } from '@/lib/stripe/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

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

export async function processCheckoutSession(sessionId: string, userId: string): Promise<{
  success: boolean
  creditsAdded: number
  error?: string
}> {
  try {
    console.log('Processing checkout session:', sessionId)

    // Verify the session with Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (!session) {
      return { success: false, creditsAdded: 0, error: 'Session not found' }
    }

    // Verify payment was successful
    if (session.payment_status !== 'paid') {
      console.log('Payment not completed:', session.payment_status)
      return { success: false, creditsAdded: 0, error: 'Payment not completed' }
    }

    // Verify this session belongs to the user
    if (session.client_reference_id !== userId && session.metadata?.userId !== userId) {
      console.error('Session does not belong to user')
      return { success: false, creditsAdded: 0, error: 'Unauthorized' }
    }

    // Get credits from session metadata
    const credits = parseInt(session.metadata?.credits || '0')
    if (!credits) {
      return { success: false, creditsAdded: 0, error: 'No credits in session' }
    }

    // Find or create the purchase record
    let purchase
    const { data: existingPurchase, error: purchaseError } = await supabaseAdmin
      .from('purchases')
      .select('id, user_id, credits, status')
      .eq('stripe_checkout_session_id', sessionId)
      .single()

    if (purchaseError || !existingPurchase) {
      // Purchase doesn't exist yet - create it now (payment is confirmed)
      console.log('Creating purchase record for confirmed payment:', sessionId)
      
      const { data: purchaseId, error: createError } = await supabaseAdmin.rpc('create_purchase', {
        p_user_id: userId,
        p_stripe_checkout_session_id: sessionId,
        p_credits: credits,
        p_amount_paid_cents: session.amount_total || 0,
      })

      if (createError || !purchaseId) {
        console.error('Failed to create purchase record:', createError)
        return { success: false, creditsAdded: 0, error: 'Failed to create purchase record' }
      }

      // Fetch the newly created purchase
      const { data: newPurchase, error: fetchError } = await supabaseAdmin
        .from('purchases')
        .select('id, user_id, credits, status')
        .eq('id', purchaseId)
        .single()

      if (fetchError || !newPurchase) {
        console.error('Failed to fetch newly created purchase:', fetchError)
        return { success: false, creditsAdded: 0, error: 'Failed to fetch purchase record' }
      }

      purchase = newPurchase
    } else {
      purchase = existingPurchase
    }

    // If already completed, return success (idempotent)
    if (purchase.status === 'completed') {
      console.log('Purchase already completed')
      return { success: true, creditsAdded: purchase.credits }
    }

    // If not pending, something is wrong
    if (purchase.status !== 'pending') {
      console.error('Purchase in unexpected status:', purchase.status)
      return { success: false, creditsAdded: 0, error: `Purchase status: ${purchase.status}` }
    }

    // Process the purchase - add credits
    console.log('Adding credits to user:', {
      user_id: purchase.user_id,
      credits: purchase.credits,
      purchase_id: purchase.id
    })

    const { error: addCreditsError } = await supabaseAdmin.rpc('add_credits_to_user', {
      p_user_id: purchase.user_id,
      p_credits: purchase.credits,
      p_purchase_id: purchase.id,
      p_payment_intent_id: session.payment_intent as string || null,
    })

    if (addCreditsError) {
      console.error('Failed to add credits:', addCreditsError)
      return { success: false, creditsAdded: 0, error: addCreditsError.message }
    }

    console.log('✅ Credits added successfully:', purchase.credits)
    
    // Revalidate the credits page and dashboard layout to refresh credits display
    revalidatePath('/dashboard/credits')
    revalidatePath('/dashboard', 'layout')
    
    return { success: true, creditsAdded: purchase.credits }
  } catch (error: any) {
    console.error('Error processing checkout session:', error)
    return { success: false, creditsAdded: 0, error: error.message }
  }
}
