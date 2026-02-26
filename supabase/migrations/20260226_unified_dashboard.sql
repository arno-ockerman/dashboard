-- ============================================================
-- Unified Dashboard Migration
-- Make It Happen | Team Werkplaats
-- Created: 2026-02-26
-- ============================================================

-- Team activity log
CREATE TABLE IF NOT EXISTS team_activity (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name text NOT NULL,
  action_type text NOT NULL, -- 'commit', 'pr', 'deploy', 'task_complete', 'message'
  description text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Tasks (Kanban board)
CREATE TABLE IF NOT EXISTS tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  assigned_to text, -- agent name
  priority text DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status text DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  project text, -- which project this belongs to
  created_by text DEFAULT 'arno',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  status text DEFAULT 'active',
  github_repo text,
  vercel_url text,
  last_update timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

-- Seed default projects
INSERT INTO projects (name, description, status, github_repo, vercel_url) VALUES
  ('Make It Happen', 'Main business & brand platform for Herbalife distribution and coaching', 'active', 'arno-ockerman/makeithappen', 'https://makeithappen.vercel.app'),
  ('Club App', 'React Native mobile app for the Herbalife Nutrition Club', 'active', 'arno-ockerman/club-app', null),
  ('Dashboard', 'AI team command center and business dashboard', 'active', 'arno-ockerman/dashboard', 'https://dashboard.vercel.app'),
  ('beinspiredbyus.be', 'Personal brand and inspiration website', 'active', 'arno-ockerman/beinspiredbyus', 'https://beinspiredbyus.be')
ON CONFLICT (name) DO NOTHING;

-- Seed sample team activity
INSERT INTO team_activity (agent_name, action_type, description, metadata) VALUES
  ('Mike', 'commit', 'Built unified dashboard with team, tasks, and projects pages', '{"branch": "feature/unified-dashboard", "files": 12}'),
  ('Jarvis', 'message', 'Orchestrated the night mission deployment pipeline', '{"channel": "webchat"}'),
  ('Kate', 'message', 'Drafted content strategy for Make It Happen Q1 2026', '{"type": "content_brief"}'),
  ('Steve', 'task_complete', 'Researched competitor apps for Club App feature set', '{"project": "Club App"}'),
  ('Alex', 'pr', 'Submitted PR for beinspiredbyus.be homepage redesign', '{"pr_number": 7, "repo": "beinspiredbyus"}')
ON CONFLICT DO NOTHING;

-- Seed sample tasks
INSERT INTO tasks (title, description, assigned_to, priority, status, project, created_by) VALUES
  ('Deploy unified dashboard to production', 'Merge feature/unified-dashboard PR and verify Vercel deployment', 'Mike', 'high', 'in_progress', 'Dashboard', 'arno'),
  ('Write onboarding flow copy', 'Create welcome sequence for new Herbalife clients', 'Kate', 'medium', 'todo', 'Make It Happen', 'arno'),
  ('Research Club App push notification setup', 'Evaluate Expo vs Firebase for push notifications', 'Steve', 'medium', 'todo', 'Club App', 'arno'),
  ('Set up Supabase RLS policies', 'Add Row Level Security to all dashboard tables', 'Mike', 'high', 'todo', 'Dashboard', 'arno'),
  ('Create Q1 content calendar', 'Plan 12 weeks of Instagram and Telegram content', 'Kate', 'medium', 'in_progress', 'Make It Happen', 'arno'),
  ('Competitor analysis report', 'Deep dive into top 5 fitness tracking apps', 'Alex', 'low', 'done', 'Club App', 'arno')
ON CONFLICT DO NOTHING;

-- Index for performance
CREATE INDEX IF NOT EXISTS team_activity_agent_idx ON team_activity(agent_name);
CREATE INDEX IF NOT EXISTS team_activity_created_idx ON team_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);
CREATE INDEX IF NOT EXISTS tasks_assigned_idx ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS tasks_project_idx ON tasks(project);

-- Updated_at trigger for tasks
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS tasks_updated_at_trigger ON tasks;
CREATE TRIGGER tasks_updated_at_trigger
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE PROCEDURE update_tasks_updated_at();
