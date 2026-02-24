'use client'

import { useState } from 'react'
import { CheckCircle2, Copy, ExternalLink, Database, AlertCircle } from 'lucide-react'

const SQL_SCHEMA = `-- Make It Happen Dashboard - Database Setup
-- Run this in Supabase SQL Editor

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

CREATE TABLE IF NOT EXISTS interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('call', 'message', 'meeting', 'email', 'social', 'other')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS habits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  icon TEXT DEFAULT '✅',
  streak INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  completed BOOLEAN DEFAULT FALSE,
  UNIQUE(habit_id, date)
);

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

-- Optional seed data for habits
INSERT INTO habits (title, icon) VALUES
  ('Train / Workout', '💪'),
  ('Drink 3L Water', '💧'),
  ('Read 20 min', '📚'),
  ('Herbalife Shake', '🌿'),
  ('Contact 3 Leads', '📱')
ON CONFLICT DO NOTHING;`

export default function SetupPage() {
  const [copied, setCopied] = useState(false)
  const [checking, setChecking] = useState(false)
  const [status, setStatus] = useState<Record<string, boolean>>({})

  const copySQL = () => {
    navigator.clipboard.writeText(SQL_SCHEMA)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const checkTables = async () => {
    setChecking(true)
    const tables = ['clients', 'interactions', 'sales', 'goals', 'habits', 'habit_logs', 'knowledge', 'content']
    const results: Record<string, boolean> = {}
    
    for (const table of tables) {
      try {
        const res = await fetch(`/api/${table === 'habit_logs' ? 'habits' : table}`)
        results[table] = res.ok
      } catch {
        results[table] = false
      }
    }
    
    setStatus(results)
    setChecking(false)
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl text-white tracking-widest uppercase mb-2"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          Database Setup
        </h1>
        <p className="text-zinc-400">One-time setup to initialize your Supabase database tables.</p>
      </div>

      {/* Steps */}
      <div className="space-y-6 mb-8">
        <div className="card">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-brand-burgundy flex items-center justify-center text-white font-bold flex-shrink-0">
              1
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-white mb-2">Open Supabase SQL Editor</h2>
              <p className="text-zinc-400 text-sm mb-3">
                Go to your Supabase project dashboard and open the SQL Editor.
              </p>
              <a
                href="https://supabase.com/dashboard/project/uldlxqyqmpjznmnokbjz/sql/new"
                target="_blank"
                rel="noreferrer"
                className="btn-primary inline-flex"
              >
                <ExternalLink className="w-4 h-4" /> Open Supabase SQL Editor
              </a>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-brand-burgundy flex items-center justify-center text-white font-bold flex-shrink-0">
              2
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-white mb-2">Copy & Run the SQL</h2>
              <p className="text-zinc-400 text-sm mb-3">
                Copy the SQL below and paste it into the Supabase SQL Editor, then click Run.
              </p>
              <button onClick={copySQL} className="btn-secondary mb-4">
                {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy SQL'}
              </button>
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 overflow-auto max-h-80">
                <pre className="text-xs text-zinc-400 whitespace-pre-wrap font-mono">{SQL_SCHEMA}</pre>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-brand-burgundy flex items-center justify-center text-white font-bold flex-shrink-0">
              3
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-white mb-2">Verify Tables</h2>
              <p className="text-zinc-400 text-sm mb-3">
                After running the SQL, click the button below to verify all tables were created.
              </p>
              <button onClick={checkTables} disabled={checking} className="btn-secondary mb-4">
                <Database className="w-4 h-4" /> {checking ? 'Checking...' : 'Check Tables'}
              </button>

              {Object.keys(status).length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(status).map(([table, ok]) => (
                    <div key={table} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
                      ok ? 'bg-green-900/20 text-green-400' : 'bg-red-900/20 text-red-400'
                    }`}>
                      {ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                      {table}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card bg-brand-green/10 border-brand-green/30">
        <p className="text-green-300 text-sm">
          <strong>🎉 Once tables are created,</strong> the dashboard is ready to use! 
          Head to the <a href="/" className="underline hover:text-white">Dashboard</a> to start adding clients, logging sales, and tracking your goals.
        </p>
      </div>
    </div>
  )
}
