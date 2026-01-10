import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import https from 'https'

const supabaseUrl = 'https://ckrahwiyrmginxennmxi.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrcmFod2l5cm1naW54ZW5ubXhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzg5MTMzMSwiZXhwIjoyMDgzNDY3MzMxfQ.F4vL3gZMSlw0_K3SRA0fCs7laQZmGwhOJ6DiY-yqk4I'

async function runMigration(migrationFile: string) {
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // Read the migration file
  const migrationPath = path.join(process.cwd(), 'supabase/migrations', migrationFile)
  const sql = fs.readFileSync(migrationPath, 'utf8')

  console.log(`\nApplying migration: ${migrationFile}`)
  console.log('=' .repeat(80))

  try {
    // Split SQL by semicolons and execute each statement
    // Note: This is a workaround since Supabase JS doesn't support raw SQL
    // We'll use RPC or REST API to execute
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    // For DDL statements, we need to use the Postgres connection directly
    // Using Supabase REST API with Management endpoint
    const projectRef = 'ckrahwiyrmginxennmxi'
    const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/database/pool`

    // Actually, let's use a simpler approach - execute via REST API using service role
    // But the Management API doesn't expose raw SQL execution
    
    // Best approach: Use the Supabase CLI db push
    console.log('\n⚠️  Migrations need to be applied via Supabase Dashboard or CLI')
    console.log('\nTo apply this migration:')
    console.log(`1. Open: https://ckrahwiyrmginxennmxi.supabase.co/project/_/sql/new`)
    console.log(`2. Copy the SQL from: supabase/migrations/${migrationFile}`)
    console.log('3. Paste and execute')
    
    // Alternative: Use Supabase CLI
    console.log('\nOr use Supabase CLI:')
    console.log(`  supabase db push --db-url "postgresql://postgres:[PASSWORD]@db.ckrahwiyrmginxennmxi.supabase.co:5432/postgres" --include-all`)
    
    // For now, let's try to use a direct pg connection if available
    console.log('\nAttempting to execute via Supabase JS RPC...')
    
    // Try executing via a function call that can execute SQL
    // This won't work directly, so we need to check if the migration was already applied
    const { data: checkTable, error: checkError } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1)

    if (!checkError && checkTable !== null) {
      console.log('✅ Migration already applied - user_profiles table exists')
      return
    }

    if (checkError && checkError.code === '42P01') {
      console.log('❌ Table does not exist - migration needs to be applied')
      console.log('\nPlease apply the migration manually via Supabase Dashboard')
      console.log('Or contact the database administrator to run the migration')
      process.exit(1)
    }

  } catch (error: any) {
    console.error('❌ Error checking migration status:', error.message)
    console.log('\nPlease apply the migration manually via Supabase Dashboard')
    process.exit(1)
  }
}

// Run the migration
runMigration('005_create_user_profiles.sql')
  .then(() => {
    console.log('\n✅ Migration check completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  })
