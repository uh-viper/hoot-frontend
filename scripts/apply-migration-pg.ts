import { Client } from 'pg'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

// Use environment variables if available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ckrahwiyrmginxennmxi.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrcmFod2l5cm1naW54ZW5ubXhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzg5MTMzMSwiZXhwIjoyMDgzNDY3MzMxfQ.F4vL3gZMSlw0_K3SRA0fCs7laQZmGwhOJ6DiY-wqk4I'

async function applyMigration() {
  const migrationPath = path.join(process.cwd(), 'supabase/migrations/015_fix_add_credits_to_user_upsert.sql')
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`)
    process.exit(1)
  }

  const sql = fs.readFileSync(migrationPath, 'utf8')

  console.log('\n📝 Applying migration: 015_fix_add_credits_to_user_upsert.sql')
  console.log('='.repeat(80))

  // Extract project ref from URL
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
  
  if (!projectRef) {
    console.error('❌ Could not extract project reference from Supabase URL')
    process.exit(1)
  }

  // Try to get database connection from environment or construct from Supabase URL
  // For Supabase, the connection pool URL is: postgresql://postgres:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
  // But we need the password which is in the Supabase dashboard
  // Alternatively, we can use the direct connection: postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
  
  // Since we don't have the password, let's use the Supabase REST API with service role
  // But Supabase doesn't expose raw SQL execution via REST API for security reasons
  
  // Best approach: Use Supabase CLI if available, or execute via the Supabase SQL Editor
  // Let's try using the Supabase CLI to execute the SQL
  console.log('\n🔧 Attempting to apply migration via Supabase SQL Editor API...')
  
  try {
    // Use the Supabase client to try executing via a special RPC function
    // But first, let's check if we can use the Supabase SQL REST endpoint
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // The Supabase SQL Editor uses this endpoint pattern for executing SQL:
    // POST /rest/v1/rpc/exec_sql
    // But this endpoint might not exist or requires special permissions
    
    // Try using fetch to the SQL execution endpoint
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ query: sql }),
      })

      if (response.ok) {
        console.log('✅ Migration applied successfully via REST API!')
        return
      } else {
        const errorText = await response.text()
        if (response.status === 404) {
          console.log('⚠️  SQL execution endpoint not available (expected for security reasons)')
        } else {
          console.log(`⚠️  REST API returned status ${response.status}: ${errorText}`)
        }
      }
    } catch (fetchError: any) {
      console.log('⚠️  REST API execution not available:', fetchError.message)
    }

    // Since direct SQL execution isn't available, we'll use the Supabase CLI
    // or provide instructions for manual execution
    console.log('\n🔧 Using Supabase CLI to apply migration...')
    
    // Check if we can use supabase db execute
    // The Supabase CLI requires the project to be linked or a connection string
    console.log('\n📋 Migration SQL:')
    console.log('-'.repeat(80))
    console.log(sql)
    console.log('-'.repeat(80))
    
    console.log('\n⚠️  Automatic execution via API is not available.')
    console.log('🔧 Applying via Supabase CLI...')
    
    // Use child_process to execute supabase CLI command
    const { exec } = require('child_process')
    const { promisify } = require('util')
    const execAsync = promisify(exec)
    
    try {
      // Try to execute via Supabase CLI db execute
      // First, let's try linking the project if not already linked
      console.log('Checking Supabase project link...')
      
      try {
        // Check if project is linked
        const { stdout: linkCheck } = await execAsync('supabase projects list 2>&1 || echo "not-linked"')
        
        if (linkCheck.includes('not-linked') || linkCheck.includes('Error')) {
          console.log('⚠️  Project not linked. Trying to link...')
          // Link project using project ref
          await execAsync(`supabase link --project-ref ${projectRef}`, { timeout: 10000 })
        }
      } catch (linkError: any) {
        console.log('⚠️  Could not link project automatically')
        console.log('   This is expected if the project requires authentication')
      }
      
      // Try to execute the SQL via Supabase CLI
      // Write SQL to a temporary file
      const tempFile = path.join(process.cwd(), 'temp_migration_015.sql')
      fs.writeFileSync(tempFile, sql)
      
      try {
        // Execute via Supabase CLI db execute
        const { stdout, stderr } = await execAsync(
          `supabase db execute --file ${tempFile} --project-ref ${projectRef}`,
          { timeout: 30000 }
        )
        
        if (stderr && !stderr.includes('Warning')) {
          throw new Error(stderr)
        }
        
        console.log('✅ Migration applied successfully via Supabase CLI!')
        console.log(stdout)
        
        // Clean up temp file
        fs.unlinkSync(tempFile)
        return
      } catch (execError: any) {
        // Clean up temp file even on error
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile)
        }
        
        if (execError.message.includes('not authenticated') || execError.message.includes('login')) {
          console.log('⚠️  Supabase CLI requires authentication')
          console.log('   Run: supabase login')
          throw execError
        }
        throw execError
      }
    } catch (cliError: any) {
      console.log('⚠️  Supabase CLI execution failed:', cliError.message)
      console.log('\n📋 Manual application required:')
      console.log(`1. Go to: https://${projectRef}.supabase.co/project/_/sql/new`)
      console.log('2. Copy and paste the SQL above')
      console.log('3. Click "Run"')
      throw cliError
    }
  } catch (error: any) {
    console.error('\n❌ Migration application failed:', error.message)
    console.log('\n📋 Please apply manually:')
    console.log(`1. Go to: https://${projectRef}.supabase.co/project/_/sql/new`)
    console.log('2. Copy and paste the SQL from the migration file')
    console.log('3. Click "Run"')
    process.exit(1)
  }
}

applyMigration()
  .then(() => {
    console.log('\n✅ Migration completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error.message)
    process.exit(1)
  })
