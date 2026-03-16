-- Enable RLS on all previously unprotected tables
-- Run date: 2026-03-16
-- Context: Security audit found 17/25 tables without RLS

-- Already executed via run-sql.mjs, saved here for documentation
DO $$
DECLARE t text;
BEGIN
  FOR t IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' AND NOT rowsecurity
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "service_full_%s" ON public.%I FOR ALL TO service_role USING (true)', t, t);
  END LOOP;
END $$;

-- Tables that were fixed:
-- contact_submissions, mealplanner_leads, daily_focus, tasks, bi_digests,
-- bi_recommendations, clients, interactions, sales, goals, habits,
-- habit_logs, knowledge, content, bi_reports, content_posts, team_activity,
-- projects, llm_usage, macro_leads
