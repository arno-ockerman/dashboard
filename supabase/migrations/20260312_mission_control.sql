-- Migration: Real-time Mission Control
-- Category: System / Agent Monitoring
-- Date: 2026-03-12

-- 1. Agent Activity Table
CREATE TABLE IF NOT EXISTS public.agent_activity (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id text UNIQUE NOT NULL, -- jarvis, mike, max, kate, lisa, alex, steve
    status text NOT NULL DEFAULT 'offline', -- online, busy, idle, offline
    current_task text,
    last_ping timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. System Activity (Live Feed)
CREATE TABLE IF NOT EXISTS public.system_activity (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    category text NOT NULL, -- health, content, system, build
    summary text NOT NULL,
    level text DEFAULT 'info', -- info, success, warning, error
    timestamp timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_activity ENABLE ROW LEVEL SECURITY;

-- Select policies for authenticated users
CREATE POLICY "Allow all select for agent_activity" ON public.agent_activity FOR SELECT USING (true);
CREATE POLICY "Allow all select for system_activity" ON public.system_activity FOR SELECT USING (true);

-- Functions for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agent_activity_updated_at
    BEFORE UPDATE ON public.agent_activity
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Seed initial agents
INSERT INTO public.agent_activity (agent_id, status, current_task)
VALUES 
    ('jarvis', 'online', 'Monitoring mission control'),
    ('mike', 'idle', NULL),
    ('max', 'idle', NULL),
    ('kate', 'idle', NULL),
    ('lisa', 'idle', NULL),
    ('alex', 'idle', NULL),
    ('steve', 'idle', NULL)
ON CONFLICT (agent_id) DO NOTHING;

-- Enable Realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE agent_activity;
ALTER PUBLICATION supabase_realtime ADD TABLE system_activity;
