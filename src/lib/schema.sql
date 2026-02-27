-- Make It Happen Dashboard Schema
-- Clients CRM
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  telegram TEXT,
  status TEXT DEFAULT 'lead' CHECK (status IN ('lead', 'prospect', 'client', 'team_member', 'inactive')),
  tags TEXT[] DEFAULT '{}',
  source TEXT DEFAULT 'other' CHECK (source IN ('instagram', 'telegram', 'referral', 'website', 'challenge', 'other')),
  notes TEXT,
  next_follow_up DATE,
  next_action TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client Interactions
CREATE TABLE IF NOT EXISTS interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('call', 'message', 'meeting', 'email', 'social', 'other')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales
CREATE TABLE IF NOT EXISTS sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name TEXT,
  product_category TEXT CHECK (product_category IN ('shakes', 'supplements', 'tea', 'aloe', 'skin', 'challenge', 'other')),
  product_name TEXT,
  amount DECIMAL(10,2) NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goals
CREATE TABLE IF NOT EXISTS goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT CHECK (category IN ('business', 'fitness', 'personal')),
  target_value DECIMAL(10,2),
  current_value DECIMAL(10,2) DEFAULT 0,
  unit TEXT,
  deadline DATE,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habits
CREATE TABLE IF NOT EXISTS habits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  icon TEXT DEFAULT '✅',
  streak INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habit Logs
CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  completed BOOLEAN DEFAULT FALSE,
  UNIQUE(habit_id, date)
);

-- Knowledge Base
CREATE TABLE IF NOT EXISTS knowledge (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT,
  description TEXT,
  thumbnail TEXT,
  type TEXT DEFAULT 'note' CHECK (type IN ('video', 'article', 'social', 'document', 'note', 'other')),
  category TEXT DEFAULT 'other' CHECK (category IN ('fitness', 'business', 'nutrition', 'tech', 'inspiration', 'herbalife', 'other')),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content Calendar
CREATE TABLE IF NOT EXISTS content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  platform TEXT CHECK (platform IN ('instagram', 'telegram', 'stories', 'reels', 'tiktok', 'other')),
  status TEXT DEFAULT 'idea' CHECK (status IN ('idea', 'draft', 'scheduled', 'posted')),
  scheduled_date DATE,
  content_type TEXT,
  media_url TEXT,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (optional, configure as needed)
-- ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE knowledge ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE content ENABLE ROW LEVEL SECURITY;

-- Phase 2 — Content Posts (new table with richer schema)
CREATE TABLE IF NOT EXISTS content_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  caption text,
  platform text DEFAULT 'instagram' CHECK (platform IN ('instagram', 'facebook', 'tiktok', 'linkedin')),
  post_type text DEFAULT 'post' CHECK (post_type IN ('reel', 'carousel', 'story', 'post', 'live')),
  media_url text,
  scheduled_date date,
  status text DEFAULT 'idea' CHECK (status IN ('idea', 'draft', 'scheduled', 'published')),
  assigned_to text DEFAULT 'kate',
  tags text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Phase 2 — Dashboard Settings (key-value config store)
CREATE TABLE IF NOT EXISTS dashboard_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text UNIQUE NOT NULL,
  value jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Phase 2 — Extend clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_contact timestamptz;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS bizworks_id text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS imported_at timestamptz;

-- Daily Focus (Big 3 Feature)
-- Run this migration via Supabase dashboard SQL Editor or your migration tool
CREATE TABLE IF NOT EXISTS daily_focus (
  id uuid default gen_random_uuid() primary key,
  user_id text not null default 'arno',
  date date not null default current_date,
  task_1 text,
  task_1_done boolean default false,
  task_2 text,
  task_2_done boolean default false,
  task_3 text,
  task_3_done boolean default false,
  reflection text,
  energy_level int check (energy_level between 1 and 5),
  focus_score int check (focus_score between 1 and 5),
  pomodoros_completed int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);
