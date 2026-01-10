import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { credits, price, packageId } = body

    // Validate input
    if (!credits || !price || !packageId) {
      return NextResponse.json(
        { error: 'Missing required fields: credits, price, packageId' },
        { status: 400 }
      )
    }

    if (credits <= 0 || price <= 0) {
      return NextResponse.json(
        { error: 'Credits and price must be greater than 0' },
        { status: 400 }
      )
    }

    // Get the base URL for redirects
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const successUrl = `${origin}/dashboard/credits?success=true&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${origin}/dashboard/credits?canceled=true`

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${credits} Credits`,
              description: `Purchase ${credits} credits for your Hoot account`,
            },
            unit_amount: Math.round(price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: user.email || undefined,
      client_reference_id: user.id,
      metadata: {
        userId: user.id,
        credits: credits.toString(),
        packageId: packageId,
        price: price.toString(),
      },
    })

    // Create purchase record in database (pending status) using RPC function
    // This bypasses RLS using SECURITY DEFINER
    const { error: dbError } = await supabase.rpc('create_purchase', {
      p_user_id: user.id,
      p_stripe_checkout_session_id: session.id,
      p_credits: credits,
      p_amount_paid_cents: Math.round(price * 100),
    })

    if (dbError) {
      console.error('Error creating purchase record:', dbError)
      // Continue anyway - webhook will create it if needed
    }

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
