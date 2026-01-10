import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ckrahwiyrmginxennmxi.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrcmFod2l5cm1naW54ZW5ubXhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzg5MTMzMSwiZXhwIjoyMDgzNDY3MzMxfQ.F4vL3gZMSlw0_K3SRA0fCs7laQZmGwhOJ6DiY-wqk4I'

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function fixStuckPurchases() {
  console.log('🔍 Finding pending purchases that might be stuck...\n')

  // Find all pending purchases
  const { data: pendingPurchases, error } = await supabaseAdmin
    .from('purchases')
    .select('id, user_id, credits, status, stripe_checkout_session_id, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error('Error fetching purchases:', error)
    return
  }

  if (!pendingPurchases || pendingPurchases.length === 0) {
    console.log('✅ No pending purchases found - all purchases are processed!')
    return
  }

  console.log(`Found ${pendingPurchases.length} pending purchase(s):\n`)

  for (const purchase of pendingPurchases) {
    console.log(`Processing purchase ${purchase.id}:`)
    console.log(`  User ID: ${purchase.user_id}`)
    console.log(`  Credits: ${purchase.credits}`)
    console.log(`  Status: ${purchase.status}`)
    console.log(`  Session ID: ${purchase.stripe_checkout_session_id}`)
    console.log(`  Created: ${purchase.created_at}`)

    // Try to add credits
    try {
      const { error: addCreditsError } = await supabaseAdmin.rpc('add_credits_to_user', {
        p_user_id: purchase.user_id,
        p_credits: purchase.credits,
        p_purchase_id: purchase.id,
      })

      if (addCreditsError) {
        console.error(`  ❌ FAILED: ${addCreditsError.message}`)
        console.error(`     Code: ${addCreditsError.code}`)
        console.error(`     Details: ${addCreditsError.details}`)
        console.error(`     Hint: ${addCreditsError.hint}`)
      } else {
        console.log(`  ✅ Successfully added ${purchase.credits} credits!`)
      }
    } catch (err: any) {
      console.error(`  ❌ Exception: ${err.message}`)
    }

    console.log('')
  }
}

fixStuckPurchases()
  .then(() => {
    console.log('✅ Done processing stuck purchases')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
