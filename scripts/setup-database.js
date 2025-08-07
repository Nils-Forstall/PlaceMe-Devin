const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey || 
    supabaseUrl === 'your_supabase_project_url' || 
    supabaseKey === 'your_supabase_anon_key') {
  console.error('❌ Missing or invalid Supabase credentials in .env.local')
  console.log('Please update .env.local with your actual Supabase credentials:')
  console.log('NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co')
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

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

async function setupDatabase() {
  console.log('🚀 Setting up Supabase database tables...')
  
  try {
    const { error: rpcError } = await supabase.rpc('exec_sql', {
      sql: createTablesSQL
    })

    if (rpcError) {
      console.error('❌ RPC method failed:', rpcError.message)
      console.log('📝 Please run the following SQL manually in your Supabase SQL editor:')
      console.log('=' * 80)
      console.log(createTablesSQL)
      console.log('=' * 80)
      return
    }

    console.log('✅ Database tables created successfully!')
    
    const { data: tables, error: listError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
    
    if (!listError && tables) {
      console.log('📋 Created tables:', tables.map(t => t.table_name).join(', '))
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message)
    console.log('📝 Please create the tables manually using the SQL provided above')
  }
}

setupDatabase()
