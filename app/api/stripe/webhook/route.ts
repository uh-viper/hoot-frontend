import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

// Initialize Supabase admin client for webhook operations
// We need the service role key for webhook operations
// Fallback to anon key if service role key not set (for local dev - not recommended for production)
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

// Get the webhook secret from environment variables
// For local testing, you can use Stripe CLI: stripe listen --forward-to localhost:3000/api/stripe/webhook
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'No signature provided' },
      { status: 400 }
    )
  }

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  try {
    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        // Only process if payment is successful
        if (session.payment_status === 'paid') {
          const userId = session.client_reference_id || session.metadata?.userId
          const credits = parseInt(session.metadata?.credits || '0')
          const amountPaid = session.amount_total || 0

          if (!userId || !credits) {
            console.error('Missing userId or credits in session metadata:', session.metadata)
            return NextResponse.json({ received: true })
          }

          // Find the purchase record by checkout session ID
          console.log('Looking up purchase for session:', session.id)
          const { data: purchase, error: purchaseError } = await supabaseAdmin
            .from('purchases')
            .select('id, user_id, credits, status, stripe_checkout_session_id')
            .eq('stripe_checkout_session_id', session.id)
            .single()
          
          console.log('Purchase lookup result:', {
            found: !!purchase,
            error: purchaseError,
            purchase: purchase
          })

          if (purchaseError || !purchase) {
            console.error('Purchase not found for session:', session.id, purchaseError)
            
            // Create purchase record if it doesn't exist using RPC function
            // This shouldn't happen normally, but handle it gracefully
            const { data: purchaseId, error: createError } = await supabaseAdmin.rpc('create_purchase', {
              p_user_id: userId,
              p_stripe_checkout_session_id: session.id,
              p_credits: credits,
              p_amount_paid_cents: amountPaid,
            })

            if (createError || !purchaseId) {
              console.error('Failed to create purchase record:', createError)
              return NextResponse.json({ received: true })
            }

            // Add credits to user (purchase was just created)
            // The function will handle payment_intent_id update atomically
            console.log('🔵 Processing NEW purchase - calling add_credits_to_user:', {
              user_id: userId,
              credits: credits,
              purchase_id: purchaseId,
              payment_intent: session.payment_intent,
              session_id: session.id
            })
            
            const { error: addCreditsError } = await supabaseAdmin.rpc('add_credits_to_user', {
              p_user_id: userId,
              p_credits: credits,
              p_purchase_id: purchaseId,
              p_payment_intent_id: session.payment_intent || null,
            })

            if (addCreditsError) {
              console.error('❌ FAILED to add credits (new purchase):', {
                error: addCreditsError,
                message: addCreditsError.message,
                code: addCreditsError.code,
                details: addCreditsError.details,
                hint: addCreditsError.hint,
                user_id: userId,
                credits: credits,
                purchase_id: purchaseId
              })
            } else {
              console.log('✅ Successfully added credits to user (new purchase):', {
                user_id: userId,
                credits_added: credits
              })
            }
          } else {
            // Purchase exists, check if we should process it
            console.log('Found existing purchase:', {
              purchase_id: purchase.id,
              status: purchase.status,
              user_id: purchase.user_id,
              credits: purchase.credits
            })
            
            // Process if pending (not yet completed)
            if (purchase.status === 'pending') {
              // Use the credits from the purchase record (source of truth), not from session metadata
              const creditsToAdd = purchase.credits
              
              console.log('Processing existing purchase:', {
                purchase_id: purchase.id,
                user_id: purchase.user_id,
                purchase_credits: purchase.credits,
                session_credits: credits,
                status: purchase.status,
                payment_intent: session.payment_intent
              })
              
              // Add credits to user FIRST (before updating payment_intent_id to avoid any issues)
              // The function will mark purchase as completed and update payment_intent_id atomically
              console.log('Calling add_credits_to_user:', {
                user_id: purchase.user_id,
                credits: creditsToAdd,
                purchase_id: purchase.id,
                payment_intent: session.payment_intent
              })
              
              const { error: addCreditsError } = await supabaseAdmin.rpc('add_credits_to_user', {
                p_user_id: purchase.user_id,
                p_credits: creditsToAdd,
                p_purchase_id: purchase.id,
                p_payment_intent_id: session.payment_intent || null,
              })

              if (addCreditsError) {
                console.error('❌ FAILED to add credits - DETAILED ERROR:', {
                  error: addCreditsError,
                  message: addCreditsError.message,
                  code: addCreditsError.code,
                  details: addCreditsError.details,
                  hint: addCreditsError.hint,
                  user_id: purchase.user_id,
                  credits: creditsToAdd,
                  purchase_id: purchase.id,
                  purchase_credits_from_db: purchase.credits,
                  purchase_status_before_call: purchase.status
                })
                
                // Update purchase status to failed if credits couldn't be added
                await supabaseAdmin
                  .from('purchases')
                  .update({ status: 'failed' })
                  .eq('id', purchase.id)
                  
                // Log the failed purchase for manual review
                console.error('PURCHASE MARKED AS FAILED - Manual review needed:', purchase.id)
              } else {
                // Verify credits were actually added
                const { data: userCredits, error: verifyError } = await supabaseAdmin
                  .from('user_credits')
                  .select('credits')
                  .eq('user_id', purchase.user_id)
                  .single()
                
                if (verifyError) {
                  console.error('⚠️  Could not verify credits were added:', verifyError)
                } else {
                  console.log('✅ Successfully added credits to user:', {
                    user_id: purchase.user_id,
                    credits_added: creditsToAdd,
                    new_total_credits: userCredits.credits,
                    purchase_id: purchase.id
                  })
                }
              }
            } else {
              console.log('⚠️  Purchase already processed, skipping:', {
                purchase_id: purchase.id,
                status: purchase.status,
                note: 'If this purchase should have credits but they are missing, manual intervention may be needed'
              })
            }
          }
        }
        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        
        // Update purchase record with payment intent ID if not already set
        if (paymentIntent.metadata?.checkout_session_id) {
          await supabaseAdmin
            .from('purchases')
            .update({ 
              stripe_payment_intent_id: paymentIntent.id,
            })
            .eq('stripe_checkout_session_id', paymentIntent.metadata.checkout_session_id)
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        
        // Mark purchase as failed
        if (paymentIntent.metadata?.checkout_session_id) {
          await supabaseAdmin
            .from('purchases')
            .update({ status: 'failed' })
            .eq('stripe_checkout_session_id', paymentIntent.metadata.checkout_session_id)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
