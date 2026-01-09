import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = 'https://ckrahwiyrmginxennmxi.supabase.co'
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrcmFod2l5cm1naW54ZW5ubXhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzg5MTMzMSwiZXhwIjoyMDgzNDY3MzMxfQ.F4vL3gZMSlw0_K3SRA0fCs7laQZmGwhOJ6DiY-yqk4I'

async function applyMigration() {
  const supabase = createClient(supabaseUrl, serviceRoleKey)
  
  // Read the migration file
  const migrationPath = path.join(process.cwd(), 'supabase/migrations/001_create_user_credits.sql')
  const sql = fs.readFileSync(migrationPath, 'utf8')
  
  console.log('Applying migration: 001_create_user_credits.sql')
  console.log('\nSQL to execute:')
  console.log('=' .repeat(80))
  console.log(sql)
  console.log('=' .repeat(80))
  
  // Supabase JS client doesn't support raw SQL execution directly
  // We need to use the Management API or execute via pg
  // For now, provide instructions
  
  console.log('\n⚠️  Note: Supabase JS client cannot execute DDL statements directly.')
  console.log('Please run this SQL in your Supabase Dashboard:')
  console.log('\n1. Go to: https://ckrahwiyrmginxennmxi.supabase.co/project/_/sql/new')
  console.log('2. Copy and paste the SQL above')
  console.log('3. Click "Run"')
  
  // Alternatively, we can try using a Postgres client
  console.log('\nOr use the Supabase CLI:')
  console.log('  supabase db push --project-ref ckrahwiyrmginxennmxi')
}

applyMigration()
