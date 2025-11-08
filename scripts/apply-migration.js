/**
 * Script to apply the scraped_data migration to Supabase
 * Run with: node scripts/apply-migration.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
  try {
    console.log('Applying migration: Adding scraped_data and last_scraped columns...');
    
    // Read the SQL migration
    const sql = readFileSync(join(__dirname, 'add-scraped-columns.sql'), 'utf-8');
    
    // Execute the migration using Supabase RPC or direct SQL
    // Note: Supabase JS client doesn't support raw SQL, so we'll use the REST API
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ sql }),
    });

    if (!response.ok) {
      // Alternative: Use direct SQL execution
      console.log('Note: Direct SQL execution via REST API may not be available.');
      console.log('Please run the SQL manually in Supabase SQL Editor:');
      console.log('\n' + sql + '\n');
      console.log('Or use psql to connect and run the migration.');
      return;
    }

    console.log('✅ Migration applied successfully!');
  } catch (error) {
    console.error('Error applying migration:', error);
    console.log('\nPlease run the SQL manually in Supabase SQL Editor:');
    console.log('File: scripts/add-scraped-columns.sql\n');
  }
}

applyMigration();

