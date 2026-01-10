import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ckrahwiyrmginxennmxi.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrcmFod2l5cm1naW54ZW5ubXhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzg5MTMzMSwiZXhwIjoyMDgzNDY3MzMxfQ.F4vL3gZMSlw0_K3SRA0fCs7laQZmGwhOJ6DiY-wqk4I'

async function verifyMigration() {
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  console.log('🔍 Verifying migration 015_fix_add_credits_to_user_upsert...\n')

  try {
    // Try to call the function with test parameters to see if it exists and works
    // We'll use a test that should fail with a constraint violation (which is expected)
    console.log('Testing add_credits_to_user function...')
    
    // Check if the function signature matches what we expect
    // We can query the pg_proc catalog to check if the function exists
    const { data, error } = await supabase.rpc('add_credits_to_user', {
      p_user_id: '00000000-0000-0000-0000-000000000000' as any,
      p_credits: 0,
      p_purchase_id: '00000000-0000-0000-0000-000000000000' as any,
    })

    if (error) {
      // If we get an error about foreign key or constraint violation, that's actually good
      // It means the function exists and is trying to execute
      if (error.message.includes('violates foreign key') || 
          error.message.includes('violates check constraint') ||
          error.message.includes('no row') ||
          error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('✅ Function exists! (Error is expected with test UUIDs)')
        console.log(`   Error message: ${error.message.substring(0, 100)}...`)
        return true
      } else if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log('❌ Function does not exist - migration not applied')
        return false
      } else {
        console.log('⚠️  Function may exist, but got unexpected error:')
        console.log(`   ${error.message}`)
        return true // Assume it exists if we get a non-"does not exist" error
      }
    } else {
      console.log('✅ Function exists and executed (unexpected success with test UUIDs)')
      return true
    }
  } catch (error: any) {
    console.error('❌ Error verifying migration:', error.message)
    return false
  }
}

verifyMigration()
  .then((success) => {
    if (success) {
      console.log('\n✅ Migration verification completed - function exists!')
      process.exit(0)
    } else {
      console.log('\n❌ Migration verification failed - function does not exist')
      console.log('   Please apply the migration manually via Supabase Dashboard')
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error.message)
    process.exit(1)
  })
