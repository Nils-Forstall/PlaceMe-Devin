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
  
  if (finalUrl === 'https://dummy.supabase.co') {
    console.log('Using dummy credentials - skipping database initialization')
    console.log('Please update .env.local with real Supabase credentials to enable automatic table creation')
    return { supabase }
  }
  
  try {
    const { error: profilesCheck } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
    
    if (profilesCheck) {
      console.log('Tables do not exist, attempting to create them programmatically...')
      
      const createTablesSQL = `
        -- Enable UUID extension if not already enabled
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        
        -- Create profiles table
        CREATE TABLE IF NOT EXISTS public.profiles (
          id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          phone TEXT,
          avatar_url TEXT,
          username TEXT,
          full_name TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create groups table
        CREATE TABLE IF NOT EXISTS public.groups (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL,
          invite_code TEXT UNIQUE NOT NULL,
          created_by UUID REFERENCES public.profiles(id),
          settings JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create group_members table
        CREATE TABLE IF NOT EXISTS public.group_members (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
          user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
          role TEXT DEFAULT 'member',
          joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(group_id, user_id)
        );

        -- Create login_events table
        CREATE TABLE IF NOT EXISTS public.login_events (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES public.profiles(id),
          email TEXT NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          success BOOLEAN NOT NULL,
          device_info TEXT
        );

        -- Create axes table
        CREATE TABLE IF NOT EXISTS public.axes (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
          vertical_axis_pair_id TEXT NOT NULL,
          horizontal_axis_pair_id TEXT NOT NULL,
          left_label TEXT NOT NULL,
          right_label TEXT NOT NULL,
          top_label TEXT NOT NULL,
          bottom_label TEXT NOT NULL,
          date_generated DATE NOT NULL,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create place_yourself table
        CREATE TABLE IF NOT EXISTS public.place_yourself (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
          group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
          group_code TEXT NOT NULL,
          username TEXT NOT NULL,
          first_name TEXT NOT NULL,
          position_x DECIMAL(5,4) NOT NULL,
          position_y DECIMAL(5,4) NOT NULL,
          top_label TEXT NOT NULL,
          bottom_label TEXT NOT NULL,
          left_label TEXT NOT NULL,
          right_label TEXT NOT NULL,
          axis_id UUID REFERENCES public.axes(id) ON DELETE CASCADE,
          vertical_axis_pair_id TEXT NOT NULL,
          horizontal_axis_pair_id TEXT NOT NULL,
          date_placed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create place_others table
        CREATE TABLE IF NOT EXISTS public.place_others (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          placer_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
          placed_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
          group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
          axis_id UUID REFERENCES public.axes(id) ON DELETE CASCADE,
          position_x DECIMAL(5,4) NOT NULL,
          position_y DECIMAL(5,4) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create comments table
        CREATE TABLE IF NOT EXISTS public.comments (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
          commenter_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
          target_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
          view_type TEXT NOT NULL,
          axis_id UUID REFERENCES public.axes(id) ON DELETE CASCADE,
          comment_text TEXT NOT NULL,
          is_deleted BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles (email);
        CREATE INDEX IF NOT EXISTS group_members_group_id_idx ON public.group_members (group_id);
        CREATE INDEX IF NOT EXISTS group_members_user_id_idx ON public.group_members (user_id);
        CREATE INDEX IF NOT EXISTS axes_group_id_idx ON public.axes (group_id);
        CREATE INDEX IF NOT EXISTS place_yourself_user_id_idx ON public.place_yourself (user_id);
        CREATE INDEX IF NOT EXISTS place_yourself_axis_id_idx ON public.place_yourself (axis_id);
        CREATE INDEX IF NOT EXISTS place_others_placer_user_id_idx ON public.place_others (placer_user_id);
        CREATE INDEX IF NOT EXISTS place_others_axis_id_idx ON public.place_others (axis_id);
        CREATE INDEX IF NOT EXISTS comments_group_id_idx ON public.comments (group_id);
        CREATE INDEX IF NOT EXISTS comments_axis_id_idx ON public.comments (axis_id);

        -- Enable Row Level Security (RLS) on all tables
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.axes ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.place_yourself ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.place_others ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

        -- Create basic RLS policies for profiles table
        CREATE POLICY "Users can view own profile" ON public.profiles
          FOR SELECT USING (auth.uid() = id);
        
        CREATE POLICY "Users can update own profile" ON public.profiles
          FOR UPDATE USING (auth.uid() = id);
        
        CREATE POLICY "Users can insert own profile" ON public.profiles
          FOR INSERT WITH CHECK (auth.uid() = id);
      `

      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: createTablesSQL
      })

      if (createError) {
        console.error('Error creating tables with RPC, trying alternative approach:', createError)
        
        const tables = [
          {
            name: 'profiles',
            sql: `CREATE TABLE IF NOT EXISTS public.profiles (
              id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
              name TEXT NOT NULL,
              email TEXT UNIQUE NOT NULL,
              phone TEXT,
              avatar_url TEXT,
              username TEXT,
              full_name TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )`
          },
          {
            name: 'groups',
            sql: `CREATE TABLE IF NOT EXISTS public.groups (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              name TEXT NOT NULL,
              invite_code TEXT UNIQUE NOT NULL,
              created_by UUID,
              settings JSONB DEFAULT '{}',
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )`
          }
        ]

        console.log('Attempting to create tables individually...')
        for (const table of tables) {
          try {
            const { error } = await supabase.rpc('exec_sql', { sql: table.sql })
            if (error) {
              console.error(`Failed to create ${table.name} table:`, error)
            } else {
              console.log(`✅ Created ${table.name} table`)
            }
          } catch (err) {
            console.error(`Error creating ${table.name} table:`, err)
          }
        }
        
        console.warn('Some tables may not have been created. You may need to create them manually in Supabase dashboard.')
        console.log('Full SQL schema available in console logs above.')
      } else {
        console.log('✅ All database tables created successfully!')
      }
    } else {
      console.log('✅ Database tables already exist!')
    }
  } catch (err) {
    console.error('Database initialization failed:', err)
    console.log('Falling back to manual setup instructions...')
    console.log('Please create the required tables manually in your Supabase dashboard using the SQL schema provided above.')
  }

  return { supabase }
}
