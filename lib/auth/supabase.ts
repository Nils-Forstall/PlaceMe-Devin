import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Anon Key:', supabaseAnonKey)

let finalUrl: string
let finalKey: string

if (!supabaseUrl || !supabaseAnonKey || 
    supabaseUrl === 'your_supabase_project_url' || 
    supabaseAnonKey === 'your_supabase_anon_key') {
  console.error('Missing or invalid Supabase environment variables')
  console.log('Please update .env.local with your actual Supabase credentials:')
  console.log('NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co')
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key')
  
  finalUrl = 'https://dummy.supabase.co'
  finalKey = 'dummy-key'
} else {
  finalUrl = supabaseUrl
  finalKey = supabaseAnonKey
}

export const supabase = createClient(finalUrl, finalKey)

// Helper function to create tables if they don't exist
export async function initializeDatabase() {
  console.log('Initializing database tables...')
  
  try {
    const { error: profilesCheck } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
    
    if (profilesCheck) {
      console.log('Tables do not exist, attempting to create them...')
      
      console.error('Database tables need to be created manually in Supabase dashboard.')
      console.log('Please create the following tables in your Supabase dashboard:')
      console.log(`
        1. profiles table:
           - id (uuid, primary key, references auth.users(id))
           - name (text, not null)
           - email (text, unique, not null)
           - phone (text)
           - avatar_url (text)
           - username (text)
           - full_name (text)
           - created_at (timestamptz, default now())

        2. groups table:
           - id (uuid, primary key, default uuid_generate_v4())
           - name (text, not null)
           - invite_code (text, unique, not null)
           - created_by (uuid, references profiles(id))
           - settings (jsonb, default '{}')
           - created_at (timestamptz, default now())

        3. group_members table:
           - id (uuid, primary key, default uuid_generate_v4())
           - group_id (uuid, references groups(id) on delete cascade)
           - user_id (uuid, references profiles(id) on delete cascade)
           - role (text, default 'member')
           - joined_at (timestamptz, default now())
           - unique constraint on (group_id, user_id)

        4. login_events table:
           - id (uuid, primary key, default uuid_generate_v4())
           - user_id (uuid, references profiles(id))
           - email (text, not null)
           - timestamp (timestamptz, default now())
           - success (boolean, not null)
           - device_info (text)

        5. axes table:
           - id (uuid, primary key, default uuid_generate_v4())
           - group_id (uuid, references groups(id) on delete cascade)
           - vertical_axis_pair_id (text, not null)
           - horizontal_axis_pair_id (text, not null)
           - left_label (text, not null)
           - right_label (text, not null)
           - top_label (text, not null)
           - bottom_label (text, not null)
           - date_generated (date, not null)
           - is_active (boolean, default true)
           - created_at (timestamptz, default now())

        6. place_yourself table:
           - id (uuid, primary key, default uuid_generate_v4())
           - user_id (uuid, references profiles(id) on delete cascade)
           - group_id (uuid, references groups(id) on delete cascade)
           - group_code (text, not null)
           - username (text, not null)
           - first_name (text, not null)
           - position_x (numeric(5,4), not null)
           - position_y (numeric(5,4), not null)
           - top_label (text, not null)
           - bottom_label (text, not null)
           - left_label (text, not null)
           - right_label (text, not null)
           - axis_id (uuid, references axes(id) on delete cascade)
           - vertical_axis_pair_id (text, not null)
           - horizontal_axis_pair_id (text, not null)
           - date_placed (timestamptz, default now())
           - created_at (timestamptz, default now())
           - updated_at (timestamptz, default now())

        7. place_others table:
           - id (uuid, primary key, default uuid_generate_v4())
           - placer_user_id (uuid, references profiles(id) on delete cascade)
           - placed_user_id (uuid, references profiles(id) on delete cascade)
           - group_id (uuid, references groups(id) on delete cascade)
           - axis_id (uuid, references axes(id) on delete cascade)
           - position_x (numeric(5,4), not null)
           - position_y (numeric(5,4), not null)
           - created_at (timestamptz, default now())

        8. comments table:
           - id (uuid, primary key, default uuid_generate_v4())
           - group_id (uuid, references groups(id) on delete cascade)
           - commenter_user_id (uuid, references profiles(id) on delete cascade)
           - target_user_id (uuid, references profiles(id) on delete cascade)
           - view_type (text, not null)
           - axis_id (uuid, references axes(id) on delete cascade)
           - comment_text (text, not null)
           - is_deleted (boolean, default false)
           - created_at (timestamptz, default now())
      `)
      
      console.warn('Continuing without database tables - authentication may fail until tables are created manually')
    } else {
      console.log('Database tables already exist!')
    }
  } catch (err) {
    console.error('Database initialization check failed:', err)
    console.warn('Continuing without database verification - authentication may fail if tables do not exist')
  }

  return { supabase }
}
