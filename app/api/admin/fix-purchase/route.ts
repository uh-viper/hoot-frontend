import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// This is a temporary admin route to fix stuck purchases
// Should be removed or protected with admin authentication in production

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
    const body = await request.json()
    const { purchaseId } = body

    if (!purchaseId) {
      return NextResponse.json(
        { error: 'purchaseId is required' },
        { status: 400 }
      )
    }

    // Get the purchase
    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from('purchases')
      .select('id, user_id, credits, status, stripe_checkout_session_id')
      .eq('id', purchaseId)
      .single()

    if (purchaseError || !purchase) {
      return NextResponse.json(
        { error: 'Purchase not found', details: purchaseError },
        { status: 404 }
      )
    }

    if (purchase.status === 'completed') {
      return NextResponse.json(
        { error: 'Purchase already completed', purchase },
        { status: 400 }
      )
    }

    console.log('Processing stuck purchase:', purchase)

    // Try to add credits
    const { error: addCreditsError } = await supabaseAdmin.rpc('add_credits_to_user', {
      p_user_id: purchase.user_id,
      p_credits: purchase.credits,
      p_purchase_id: purchase.id,
    })

    if (addCreditsError) {
      console.error('Failed to add credits:', addCreditsError)
      return NextResponse.json(
        {
          error: 'Failed to add credits',
          details: addCreditsError,
          purchase
        },
        { status: 500 }
      )
    }

    // Get updated purchase status
    const { data: updatedPurchase } = await supabaseAdmin
      .from('purchases')
      .select('*')
      .eq('id', purchase.id)
      .single()

    return NextResponse.json({
      success: true,
      message: 'Credits added successfully',
      purchase: updatedPurchase
    })
  } catch (error: any) {
    console.error('Error fixing purchase:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
