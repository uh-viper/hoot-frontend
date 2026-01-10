import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ckrahwiyrmginxennmxi.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrcmFod2l5cm1naG54ZW5ubXhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzg5MTMzMSwiZXhwIjoyMDgzNDY3MzMxfQ.F4vL3gZMSlw0_K3SRA0fCs7laQZmGwhOJ6DiY-wqk4I'

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function processStuckPurchases() {
  console.log('🔍 Finding all pending purchases...\n')

  // Get all pending purchases
  const { data: pendingPurchases, error: fetchError } = await supabaseAdmin
    .from('purchases')
    .select('id, user_id, credits, status, stripe_checkout_session_id, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (fetchError) {
    console.error('❌ Error fetching purchases:', fetchError)
    return
  }

  if (!pendingPurchases || pendingPurchases.length === 0) {
    console.log('✅ No pending purchases found!')
    return
  }

  console.log(`Found ${pendingPurchases.length} pending purchase(s):\n`)

  let successCount = 0
  let failCount = 0

  for (const purchase of pendingPurchases) {
    console.log(`Processing purchase ${purchase.id}:`)
    console.log(`  User ID: ${purchase.user_id}`)
    console.log(`  Credits: ${purchase.credits}`)
    console.log(`  Session ID: ${purchase.stripe_checkout_session_id}`)
    console.log(`  Created: ${purchase.created_at}`)

    try {
      // Get user credits before
      const { data: creditsBefore } = await supabaseAdmin
        .from('user_credits')
        .select('credits')
        .eq('user_id', purchase.user_id)
        .single()

      console.log(`  Credits before: ${creditsBefore?.credits || 0}`)

      // Call add_credits_to_user function
      const { error: addCreditsError } = await supabaseAdmin.rpc('add_credits_to_user', {
        p_user_id: purchase.user_id,
        p_credits: purchase.credits,
        p_purchase_id: purchase.id,
        p_payment_intent_id: null,
      })

      if (addCreditsError) {
        console.error(`  ❌ FAILED:`, {
          message: addCreditsError.message,
          code: addCreditsError.code,
          details: addCreditsError.details,
          hint: addCreditsError.hint
        })
        failCount++
      } else {
        // Verify credits were actually added
        const { data: creditsAfter } = await supabaseAdmin
          .from('user_credits')
          .select('credits')
          .eq('user_id', purchase.user_id)
          .single()

        console.log(`  ✅ SUCCESS! Credits after: ${creditsAfter?.credits || 0}`)
        console.log(`  ✅ Added ${purchase.credits} credits to user`)
        successCount++
      }
    } catch (err: any) {
      console.error(`  ❌ EXCEPTION:`, err.message)
      failCount++
    }

    console.log('')
  }

  console.log('\n📊 SUMMARY:')
  console.log(`  ✅ Successfully processed: ${successCount}`)
  console.log(`  ❌ Failed: ${failCount}`)
  console.log(`  📦 Total: ${pendingPurchases.length}`)
}

processStuckPurchases()
  .then(() => {
    console.log('\n✅ Done processing stuck purchases')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })
