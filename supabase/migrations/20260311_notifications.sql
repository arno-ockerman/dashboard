-- ============================================================
-- Notifications table — 2026-03-11 Nightly Build
-- System event aggregator (crons, builds, errors, PR status)
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  type         TEXT         NOT NULL CHECK (type IN ('success', 'error', 'warning', 'info')),
  title        TEXT         NOT NULL,
  message      TEXT         NOT NULL,
  source       TEXT         NOT NULL,  -- e.g. "cron/nightly-build", "system/health", "github/pr"
  read         BOOLEAN      DEFAULT FALSE,
  metadata     JSONB        DEFAULT '{}',  -- extra data (pr_url, branch, files, etc.)
  created_at   TIMESTAMPTZ  DEFAULT NOW()
);

-- Indexes for common filter patterns
CREATE INDEX IF NOT EXISTS idx_notifications_read       ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_type       ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created    ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_source     ON notifications(source);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'Allow all for anon and authenticated'
  ) THEN
    CREATE POLICY "Allow all for anon and authenticated"
      ON notifications FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Seed function with realistic sample data
CREATE OR REPLACE FUNCTION seed_notifications() RETURNS void AS $$
BEGIN
  INSERT INTO notifications (type, title, message, source, read, metadata, created_at) VALUES
    ('success', 'Nightly Build Complete',       'Dashboard Health & Recovery feature built — PR #19 ready for review.',                                   'cron/nightly-build',         false, '{"pr_url":"https://github.com/arno-ockerman/dashboard/pull/19","branch":"feature/2026-03-06-health-dashboard","files":4,"lines":734}',  NOW() - INTERVAL '1 day 1 hour'),
    ('success', 'Memory Consolidation Done',    'Nightly memory consolidation completed. 3 PARA files updated, 2 daily notes archived.',                  'cron/memory-consolidation',  false, '{"files_updated":3,"notes_archived":2}',                                                                                                NOW() - INTERVAL '1 day 2 hours'),
    ('error',   'Dashboard Server Crash',       'Express.js dashboard (TrueNAS) crashed — watchdog restarted process. PID: 92546.',                       'system/watchdog',            true,  '{"pid":92546,"restarts_today":3}',                                                                                                      NOW() - INTERVAL '2 days 3 hours'),
    ('info',    'Club App PR #17 Created',      'QR Code Check-In System — 18 files, 1,212 lines. Awaiting review.',                                      'github/pr',                  true,  '{"pr_url":"https://github.com/arno-ockerman/Club-app/pull/17","files":18,"lines":1212}',                                                 NOW() - INTERVAL '4 days'),
    ('warning', 'TypeScript Warning',           'Standalone tsc --noEmit fails on stale .next/types references. Build still succeeds normally.',           'system/build',               true,  '{"errors":0,"warnings":1}',                                                                                                             NOW() - INTERVAL '7 days'),
    ('success', 'Daily Backup Complete',        'All memory files backed up to GitHub. 127 files, 0 conflicts.',                                          'cron/backup',                true,  '{"files":127,"conflicts":0}',                                                                                                           NOW() - INTERVAL '1 day 30 minutes'),
    ('info',    'New Lead from Website',        'Sarah Janssen signed up via challenge form. Auto-added to CRM.',                                         'crm/lead',                   false, '{"email":"sarah.janssen@example.com","source":"challenge_form"}',                                                                       NOW() - INTERVAL '3 hours'),
    ('success', 'Level 1 Tests Passed',         'Daily system tests: Memory ✅ | PARA ✅ | Cron ✅ | Git ✅ | Disk ✅',                                   'cron/test-level1',           false, '{"passed":5,"failed":0}',                                                                                                               NOW() - INTERVAL '2 hours'),
    ('success', 'Club App Nightly Build',       'Session Ratings & Reviews feature built — PR #18 ready.',                                               'cron/nightly-build',         true,  '{"pr_url":"https://github.com/arno-ockerman/Club-app/pull/18","branch":"feature/2026-03-07-session-ratings","files":6,"lines":445}',    NOW() - INTERVAL '4 days 1 hour'),
    ('warning', 'Disk Space Warning',           'TrueNAS pool usage at 72%. Consider cleaning old Docker images.',                                        'system/health',              false, '{"used_pct":72,"threshold":80}',                                                                                                        NOW() - INTERVAL '5 hours')
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;
