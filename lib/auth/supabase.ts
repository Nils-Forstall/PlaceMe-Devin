import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Anon Key:', supabaseAnonKey)

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to create tables if they don't exist
export async function initializeDatabase() {
  // Check if the users table exists
  const { error: checkError } = await supabase
    .from('users')
    .select('id')
    .limit(1)
  
  // If table doesn't exist, create it
  if (checkError) {
    console.log('Creating users table...')
    
    // We'll use SQL to create the table with proper constraints
    const { error: createError } = await supabase.rpc('create_users_table', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL,
          phone TEXT,
          email TEXT,
          selfie_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create index on email for faster lookups
        CREATE INDEX IF NOT EXISTS users_email_idx ON public.users (email);
      `
    })
    
    if (createError) {
      console.error('Error creating users table:', createError)
    } else {
      console.log('Users table created successfully!')
    }
  }
  
  return { supabase }
}