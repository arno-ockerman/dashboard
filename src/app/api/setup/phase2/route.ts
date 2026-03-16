export const dynamic = 'force-dynamic'
/**
 * Phase 2 Migration Endpoint
 * 
 * Run this ONCE after deploying Phase 2 to create the new tables.
 * POST /api/setup/phase2
 * 
 * This endpoint attempts to create content_posts and dashboard_settings tables
 * using the exec_sql RPC if available, otherwise returns instructions.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const MIGRATION_SQL = `
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

CREATE TABLE IF NOT EXISTS dashboard_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text UNIQUE NOT NULL,
  value jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_contact timestamptz;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS bizworks_id text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS imported_at timestamptz;

INSERT INTO dashboard_settings (key, value) VALUES
  ('team_models', '{"Jarvis": "Claude Opus 4.6", "Mike": "GPT-5.3 Codex", "Kate": "Claude Opus 4.6", "Steve": "Gemini 3.1 Pro", "Alex": "Gemini 2.5 Pro"}'::jsonb),
  ('notifications', '{"email": false, "telegram": true, "daily_digest": true}'::jsonb),
  ('revenue_target', '5000'::jsonb),
  ('brand_name', '"Make It Happen"'::jsonb)
ON CONFLICT (key) DO NOTHING;
`

export async function POST() {
  const results: Array<{ step: string; status: string; message?: string }> = []

  // Try exec_sql approach
  const statements = MIGRATION_SQL.split(';').map((s) => s.trim()).filter((s) => s.length > 5 && !s.startsWith('--'))

  for (const sql of statements) {
    const label = sql.split('\n')[0].substring(0, 60)
    try {
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql })
      if (error) {
        results.push({ step: label, status: 'error', message: error.message })
      } else {
        results.push({ step: label, status: 'ok' })
      }
    } catch (e) {
      results.push({ step: label, status: 'error', message: String(e) })
    }
  }

  const hasErrors = results.some((r) => r.status === 'error')

  if (hasErrors && results[0]?.message?.includes('exec_sql')) {
    return NextResponse.json({
      success: false,
      message: 'exec_sql RPC not available. Please run the migration manually in Supabase SQL Editor.',
      sql: MIGRATION_SQL,
      supabase_sql_editor: 'https://supabase.com/dashboard/project/uldlxqyqmpjznmnokbjz/sql/new',
      results,
    })
  }

  return NextResponse.json({
    success: !hasErrors,
    results,
  })
}

export async function GET() {
  // Check migration status
  const checks = await Promise.allSettled([
    supabaseAdmin.from('content_posts').select('id').limit(1),
    supabaseAdmin.from('dashboard_settings').select('id').limit(1),
  ])

  return NextResponse.json({
    content_posts: checks[0].status === 'fulfilled' && !checks[0].value.error ? 'exists' : 'missing',
    dashboard_settings: checks[1].status === 'fulfilled' && !checks[1].value.error ? 'exists' : 'missing',
    migration_sql_url: '/api/setup/phase2 (POST)',
    supabase_sql_editor: 'https://supabase.com/dashboard/project/uldlxqyqmpjznmnokbjz/sql/new',
    migration_file: 'supabase/migrations/20260227_phase2.sql',
  })
}
