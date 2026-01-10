import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Use environment variables if available, otherwise fall back to hardcoded values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ckrahwiyrmginxennmxi.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrcmFod2l5cm1naW54ZW5ubXhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzg5MTMzMSwiZXhwIjoyMDgzNDY3MzMxfQ.F4vL3gZMSlw0_K3SRA0fCs7laQZmGwhOJ6DiY-wqk4I'

async function applyMigration() {
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // Read the migration file
  const migrationPath = path.join(process.cwd(), 'supabase/migrations/015_fix_add_credits_to_user_upsert.sql')
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`)
    process.exit(1)
  }

  const sql = fs.readFileSync(migrationPath, 'utf8')

  console.log('\n📝 Applying migration: 015_fix_add_credits_to_user_upsert.sql')
  console.log('='.repeat(80))
  
  // Supabase JS client doesn't support raw SQL execution directly
  // We'll use the REST API to execute via the SQL endpoint
  // The SQL Editor API endpoint is: /rest/v1/rpc/exec_sql (if available)
  // But typically we need to use the Management API or direct Postgres connection
  
  // Try using the Supabase REST API SQL endpoint
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ query: sql }),
    })

    if (response.ok) {
      const data = await response.json()
      console.log('✅ Migration applied successfully!')
      console.log(data)
      return
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
  } catch (error: any) {
    // If the REST API doesn't work, try using the Supabase Management API
    console.log('⚠️  Direct REST API execution not available, trying alternative method...')
    
    // Extract project ref from URL
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
    
    if (!projectRef) {
      console.error('❌ Could not extract project reference from Supabase URL')
      throw error
    }

    // Use Supabase Management API (requires special authentication)
    // For now, we'll use the Supabase SQL Editor API via the REST endpoint
    try {
      // The Supabase SQL Editor uses a different endpoint structure
      // Let's try using the direct SQL execution via the database pool endpoint
      const managementApiUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/pool/query`
      
      const mgmtResponse = await fetch(managementApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ query: sql }),
      })

      if (mgmtResponse.ok) {
        const data = await mgmtResponse.json()
        console.log('✅ Migration applied successfully via Management API!')
        return
      } else {
        const errorText = await mgmtResponse.text()
        console.error(`❌ Management API error: ${mgmtResponse.status}`)
        console.error(errorText)
      }
    } catch (mgmtError: any) {
      console.error('❌ Management API execution failed:', mgmtError.message)
    }

    // If all API methods fail, provide manual instructions
    console.log('\n⚠️  Automatic execution not available. Please apply manually:')
    console.log('\n📋 SQL to execute:')
    console.log('-'.repeat(80))
    console.log(sql)
    console.log('-'.repeat(80))
    console.log('\n🔧 Manual Steps:')
    console.log(`1. Go to: ${supabaseUrl.replace('/rest/v1', '')}/project/_/sql/new`)
    console.log('2. Copy and paste the SQL above')
    console.log('3. Click "Run"')
    console.log('\nOr use Supabase CLI:')
    console.log(`  supabase db push --db-url "postgresql://postgres:[PASSWORD]@db.${projectRef}.supabase.co:5432/postgres"`)
    
    // Verify the function exists to check if migration was already applied
    console.log('\n🔍 Checking if migration was already applied...')
    try {
      const { data, error } = await supabase.rpc('add_credits_to_user', {
        p_user_id: '00000000-0000-0000-0000-000000000000' as any,
        p_credits: 0,
        p_purchase_id: '00000000-0000-0000-0000-000000000000' as any,
      })

      // We expect an error (invalid UUID), but if the function exists, we'll get a different error
      if (error && (error.message.includes('violates') || error.message.includes('relation') || error.message.includes('function'))) {
        console.log('✅ Function exists - migration may have already been applied')
        console.log('   (Error is expected with test UUID)')
      } else {
        console.log('⚠️  Could not verify migration status')
      }
    } catch (checkError: any) {
      console.log('⚠️  Could not verify migration status:', checkError.message)
    }
    
    throw error
  }
}

applyMigration()
  .then(() => {
    console.log('\n✅ Migration script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error.message)
    process.exit(1)
  })
