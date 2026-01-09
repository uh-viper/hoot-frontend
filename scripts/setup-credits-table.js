const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://ckrahwiyrmginxennmxi.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrcmFod2l5cm1naW54ZW5ubXhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzg5MTMzMSwiZXhwIjoyMDgzNDY3MzMxfQ.F4vL3gZMSlw0_K3SRA0fCs7laQZmGwhOJ6DiY-yqk4I';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function runMigration() {
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/001_create_user_credits.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration...');
    
    // Split SQL into individual statements (handle functions and triggers properly)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    // Execute each statement
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          // Use RPC or direct SQL execution
          const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
          
          // If RPC doesn't exist, try direct query
          if (error) {
            // For DDL statements, we might need to use the management API
            // Let's try a different approach - execute via SQL editor API
            console.log(`Executing: ${statement.substring(0, 50)}...`);
          }
        } catch (err) {
          console.error(`Error executing statement: ${err.message}`);
        }
      }
    }

    // Alternative: Use the Supabase Management API or direct Postgres connection
    // For now, let's use a simpler approach with raw SQL via REST
    console.log('\nMigration SQL prepared. Running via Supabase REST API...');
    
    // Execute the entire SQL as one query
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!response.ok) {
      // Fallback: output the SQL for manual execution
      console.log('\n⚠️  Automatic execution failed. Please run this SQL manually in Supabase SQL Editor:');
      console.log('\n' + '='.repeat(80));
      console.log(sql);
      console.log('='.repeat(80));
      console.log('\nGo to: https://ckrahwiyrmginxennmxi.supabase.co/project/_/sql');
    } else {
      console.log('✅ Migration applied successfully!');
    }

  } catch (error) {
    console.error('Error running migration:', error);
    console.log('\nPlease run the SQL manually in Supabase SQL Editor:');
    console.log('https://ckrahwiyrmginxennmxi.supabase.co/project/_/sql');
  }
}

runMigration();
