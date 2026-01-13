/**
 * Script to grant admin access to a user
 * Usage: 
 *   tsx scripts/grant-admin-access.ts <user_email>
 *   OR
 *   tsx scripts/grant-admin-access.ts <user_id>
 */

import { createClient } from '@supabase/supabase-js'

// Try to load environment variables from .env.local (optional)
try {
  const dotenv = await import('dotenv')
  dotenv.config({ path: '.env.local' })
} catch {
  // dotenv not installed, environment variables should be set in shell
  console.log('ℹ️  Note: Install dotenv for .env.local support, or set env vars in shell')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function grantAdminAccess(identifier: string) {
  try {
    console.log(`🔍 Looking up user: ${identifier}...`)

    // Check if identifier is an email or user ID
    let userId: string | null = null
    let userEmail: string | null = null

    if (identifier.includes('@')) {
      // It's an email
      userEmail = identifier
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserByEmail(identifier)
      
      if (authError || !authUser?.user) {
        console.error(`❌ User not found with email: ${identifier}`)
        console.error('   Error:', authError?.message)
        process.exit(1)
      }
      
      userId = authUser.user.id
      console.log(`✅ Found user: ${authUser.user.email} (${userId})`)
    } else {
      // Assume it's a user ID
      userId = identifier
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(identifier)
      
      if (authError || !authUser?.user) {
        console.error(`❌ User not found with ID: ${identifier}`)
        console.error('   Error:', authError?.message)
        process.exit(1)
      }
      
      userEmail = authUser.user.email || 'N/A'
      console.log(`✅ Found user: ${userEmail} (${userId})`)
    }

    // Check if user profile exists
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, user_id, email, is_admin')
      .eq('user_id', userId)
      .single()

    if (profileError || !profile) {
      console.error(`❌ User profile not found. User might need to sign in first.`)
      console.error('   Error:', profileError?.message)
      process.exit(1)
    }

    if (profile.is_admin) {
      console.log(`⚠️  User ${userEmail} already has admin access.`)
      return
    }

    // Grant admin access
    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({ is_admin: true })
      .eq('user_id', userId)

    if (updateError) {
      console.error(`❌ Failed to grant admin access:`)
      console.error('   Error:', updateError.message)
      process.exit(1)
    }

    console.log(`✅ Successfully granted admin access to ${userEmail} (${userId})`)
    console.log(`\n🎉 The user can now access the admin dashboard at /dashboard/admin`)

  } catch (error: any) {
    console.error('❌ Unexpected error:')
    console.error(error)
    process.exit(1)
  }
}

// Get identifier from command line arguments
const identifier = process.argv[2]

if (!identifier) {
  console.error('❌ Usage: tsx scripts/grant-admin-access.ts <user_email|user_id>')
  console.error('\nExamples:')
  console.error('   tsx scripts/grant-admin-access.ts user@example.com')
  console.error('   tsx scripts/grant-admin-access.ts 123e4567-e89b-12d3-a456-426614174000')
  process.exit(1)
}

grantAdminAccess(identifier)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
