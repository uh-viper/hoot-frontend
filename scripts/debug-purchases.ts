import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ckrahwiyrmginxennmxi.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!serviceRoleKey) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function debugPurchases() {
  console.log('🔍 Checking recent purchases...\n')

  // Get recent purchases
  const { data: purchases, error: purchasesError } = await supabaseAdmin
    .from('purchases')
    .select('id, user_id, credits, status, stripe_checkout_session_id, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  if (purchasesError) {
    console.error('❌ Error fetching purchases:', purchasesError)
    return
  }

  if (!purchases || purchases.length === 0) {
    console.log('No purchases found')
    return
  }

  console.log(`Found ${purchases.length} purchase(s):\n`)

  for (const purchase of purchases) {
    console.log(`Purchase ${purchase.id}:`)
    console.log(`  User ID: ${purchase.user_id}`)
    console.log(`  Credits: ${purchase.credits}`)
    console.log(`  Status: ${purchase.status}`)
    console.log(`  Session ID: ${purchase.stripe_checkout_session_id}`)
    console.log(`  Created: ${purchase.created_at}`)

    // Check user credits
    const { data: userCredits, error: creditsError } = await supabaseAdmin
      .from('user_credits')
      .select('user_id, credits')
      .eq('user_id', purchase.user_id)
      .single()

    if (creditsError) {
      console.log(`  ⚠️  User credits row: NOT FOUND (${creditsError.message})`)
    } else {
      console.log(`  ✅ User credits: ${userCredits.credits}`)
    }

    // Test the function if purchase is pending
    if (purchase.status === 'pending') {
      console.log(`  🔧 Testing add_credits_to_user function...`)
      
      try {
        const { error: testError } = await supabaseAdmin.rpc('add_credits_to_user', {
          p_user_id: purchase.user_id,
          p_credits: purchase.credits,
          p_purchase_id: purchase.id,
        })

        if (testError) {
          console.error(`  ❌ Function failed:`, {
            message: testError.message,
            code: testError.code,
            details: testError.details,
            hint: testError.hint
          })
        } else {
          console.log(`  ✅ Function succeeded!`)
          
          // Check credits again
          const { data: updatedCredits } = await supabaseAdmin
            .from('user_credits')
            .select('credits')
            .eq('user_id', purchase.user_id)
            .single()
          
          console.log(`  📊 Updated credits: ${updatedCredits?.credits}`)
        }
      } catch (err: any) {
        console.error(`  ❌ Exception:`, err.message)
      }
    }

    console.log('')
  }
}

debugPurchases()
  .then(() => {
    console.log('✅ Debug complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
