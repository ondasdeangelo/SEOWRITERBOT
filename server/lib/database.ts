import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@shared/schema';

// Validate environment variables
const requiredEnvVars = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
};

// In development, we'll allow missing vars
if (process.env.NODE_ENV !== 'development') {
  Object.entries(requiredEnvVars).forEach(([name, value]) => {
    if (!value) {
      throw new Error(`Missing ${name} environment variable`);
    }
  });
}

// Create Supabase client
export const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

// Create a Postgres client for Drizzle
const client = process.env.DATABASE_URL 
  ? postgres(process.env.DATABASE_URL, { max: 1 })
  : null;

// Create Drizzle database instance
export const db = client 
  ? drizzle(client, { schema }) 
  : {} as ReturnType<typeof drizzle>;

// Database health check function
export async function checkDatabaseConnection() {
  try {
    if (!client) {
      throw new Error('Database client not initialized');
    }
    const { data, error } = await supabase
      .from('users')
      .select('count(*)')
      .single();
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Database connection error:', error);
    return false;
  }
}