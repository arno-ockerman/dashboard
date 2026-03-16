-- Missing tables for Dashboard (notifications, agent_activity, system_activity)
-- Run via: node scripts/run-sql.mjs --file supabase/migrations/20260316_missing_tables.sql

-- 1. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('success', 'error', 'warning', 'info')),
  title text NOT NULL,
  message text NOT NULL,
  source text NOT NULL,
  read boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications (read, created_at DESC) WHERE read = false;

-- 2. Agent Activity (realtime heartbeats from AI agents)
CREATE TABLE IF NOT EXISTS public.agent_activity (
  agent_id text PRIMARY KEY,
  status text NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'busy', 'idle', 'offline')),
  current_task text,
  last_ping timestamptz DEFAULT now()
);

-- 3. System Activity (feed of system events)
CREATE TABLE IF NOT EXISTS public.system_activity (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,
  summary text NOT NULL,
  level text NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'success', 'warning', 'error')),
  timestamp timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_activity_recent ON public.system_activity (timestamp DESC);

-- Enable Realtime for agent_activity and system_activity
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_activity;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_activity;

-- RLS (allow anon read, service role full access)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_notifications" ON public.notifications FOR SELECT TO anon USING (true);
CREATE POLICY "service_full_notifications" ON public.notifications FOR ALL TO service_role USING (true);

CREATE POLICY "anon_read_agent_activity" ON public.agent_activity FOR SELECT TO anon USING (true);
CREATE POLICY "service_full_agent_activity" ON public.agent_activity FOR ALL TO service_role USING (true);

CREATE POLICY "anon_read_system_activity" ON public.system_activity FOR SELECT TO anon USING (true);
CREATE POLICY "service_full_system_activity" ON public.system_activity FOR ALL TO service_role USING (true);
