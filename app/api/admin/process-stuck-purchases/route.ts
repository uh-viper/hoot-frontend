import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// This is an admin endpoint to manually process stuck pending purchases
// Should be protected in production, but for now we'll use it to fix the immediate issue

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

export async function POST(request: NextRequest) {
  try {
    // Get all pending purchases
    const { data: pendingPurchases, error: fetchError } = await supabaseAdmin
      .from('purchases')
      .select('id, user_id, credits, status, stripe_checkout_session_id, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (fetchError) {
      return NextResponse.json(
        { error: 'Failed to fetch purchases', details: fetchError },
        { status: 500 }
      )
    }

    if (!pendingPurchases || pendingPurchases.length === 0) {
      return NextResponse.json({ 
        message: 'No pending purchases found',
        processed: 0
      })
    }

    const results = []

    for (const purchase of pendingPurchases) {
      try {
        console.log(`Processing purchase ${purchase.id} for user ${purchase.user_id}:`, {
          credits: purchase.credits,
          session_id: purchase.stripe_checkout_session_id
        })

        // Call add_credits_to_user function
        const { error: addCreditsError } = await supabaseAdmin.rpc('add_credits_to_user', {
          p_user_id: purchase.user_id,
          p_credits: purchase.credits,
          p_purchase_id: purchase.id,
          p_payment_intent_id: null, // We don't have payment intent ID from the purchase
        })

        if (addCreditsError) {
          console.error(`Failed to process purchase ${purchase.id}:`, addCreditsError)
          results.push({
            purchase_id: purchase.id,
            status: 'failed',
            error: addCreditsError.message,
            code: addCreditsError.code
          })
        } else {
          // Verify credits were actually added
          const { data: userCredits } = await supabaseAdmin
            .from('user_credits')
            .select('credits')
            .eq('user_id', purchase.user_id)
            .single()

          results.push({
            purchase_id: purchase.id,
            status: 'success',
            credits_added: purchase.credits,
            new_total_credits: userCredits?.credits || 0
          })
        }
      } catch (err: any) {
        console.error(`Exception processing purchase ${purchase.id}:`, err)
        results.push({
          purchase_id: purchase.id,
          status: 'error',
          error: err.message
        })
      }
    }

    const successCount = results.filter(r => r.status === 'success').length
    const failedCount = results.filter(r => r.status !== 'success').length

    return NextResponse.json({
      message: `Processed ${pendingPurchases.length} purchases`,
      processed: successCount,
      failed: failedCount,
      results
    })
  } catch (error: any) {
    console.error('Error processing stuck purchases:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
