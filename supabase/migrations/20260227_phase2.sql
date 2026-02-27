-- Dashboard Phase 2 Migration
-- Date: 2026-02-27
-- Author: Mike (AI Developer)

-- ─── Content Posts Table ─────────────────────────────────────────────────────
-- New table for content planning with richer schema than the legacy `content` table

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

-- Index for calendar queries
CREATE INDEX IF NOT EXISTS idx_content_posts_scheduled_date ON content_posts (scheduled_date);
CREATE INDEX IF NOT EXISTS idx_content_posts_status ON content_posts (status);
CREATE INDEX IF NOT EXISTS idx_content_posts_platform ON content_posts (platform);

-- ─── Extend Clients Table ─────────────────────────────────────────────────────
-- Add new columns to the existing clients table for Phase 2 CRM features

ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status text DEFAULT 'lead';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_contact timestamptz;

-- Add a bizworks-specific metadata column
ALTER TABLE clients ADD COLUMN IF NOT EXISTS bizworks_id text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS imported_at timestamptz;

-- Index for CRM queries
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients (status);
CREATE INDEX IF NOT EXISTS idx_clients_source ON clients (source);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients (email);

-- ─── Settings / Config Table ──────────────────────────────────────────────────
-- Key-value store for dashboard settings

CREATE TABLE IF NOT EXISTS dashboard_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text UNIQUE NOT NULL,
  value jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Seed default settings
INSERT INTO dashboard_settings (key, value) VALUES
  ('team_models', '{"Jarvis": "Claude Opus 4.6", "Mike": "GPT-5.3 Codex", "Kate": "Claude Opus 4.6", "Steve": "Gemini 3.1 Pro", "Alex": "Gemini 2.5 Pro"}'::jsonb),
  ('notifications', '{"email": false, "telegram": true, "daily_digest": true}'::jsonb),
  ('revenue_target', '5000'::jsonb),
  ('brand_name', '"Make It Happen"'::jsonb)
ON CONFLICT (key) DO NOTHING;
