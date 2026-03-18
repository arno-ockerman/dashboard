-- ============================================================
-- 21-Day Challenge Tracker
-- Created: 2026-03-18 (Evening Build)
-- ============================================================

-- challenges table
CREATE TABLE IF NOT EXISTS challenges (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT,
  type          TEXT NOT NULL DEFAULT '21day', -- '21day', '28day', 'custom'
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','completed','archived')),
  target_count  INT DEFAULT 21,
  color         TEXT DEFAULT '#10b981', -- accent color for UI
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- challenge_participants table
CREATE TABLE IF NOT EXISTS challenge_participants (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id    UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  client_id       UUID REFERENCES clients(id) ON DELETE SET NULL,
  name            TEXT NOT NULL, -- snapshot of client name (in case client deleted)
  telegram        TEXT,
  enrolled_at     DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_at    TIMESTAMPTZ,
  last_checkin    DATE,
  current_day     INT DEFAULT 1,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','dropped','paused')),
  checkin_streak  INT DEFAULT 0,
  total_checkins  INT DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (challenge_id, client_id)
);

-- challenge_checkins table (log of daily check-ins)
CREATE TABLE IF NOT EXISTS challenge_checkins (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id  UUID NOT NULL REFERENCES challenge_participants(id) ON DELETE CASCADE,
  challenge_id    UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  checkin_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  day_number      INT NOT NULL,
  mood            INT CHECK (mood BETWEEN 1 AND 5),
  weight_kg       NUMERIC(5,2),
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (participant_id, checkin_date)
);

-- RLS policies
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_checkins ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "service_role_challenges" ON challenges TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_participants" ON challenge_participants TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_checkins" ON challenge_checkins TO service_role USING (true) WITH CHECK (true);

-- updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_challenges_updated_at') THEN
    CREATE TRIGGER update_challenges_updated_at
      BEFORE UPDATE ON challenges
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_challenge_participants_updated_at') THEN
    CREATE TRIGGER update_challenge_participants_updated_at
      BEFORE UPDATE ON challenge_participants
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- RPC: get_challenge_stats(challenge_id)
CREATE OR REPLACE FUNCTION get_challenge_stats(p_challenge_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total',       COUNT(*),
    'active',      COUNT(*) FILTER (WHERE status = 'active'),
    'completed',   COUNT(*) FILTER (WHERE status = 'completed'),
    'dropped',     COUNT(*) FILTER (WHERE status = 'dropped'),
    'avg_day',     ROUND(AVG(current_day), 1),
    'completion_rate', ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'completed') / NULLIF(COUNT(*),0), 1),
    'needs_checkin', COUNT(*) FILTER (WHERE status = 'active' AND (last_checkin IS NULL OR last_checkin < CURRENT_DATE - 2))
  )
  INTO v_result
  FROM challenge_participants
  WHERE challenge_id = p_challenge_id;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View: challenge_overview
CREATE OR REPLACE VIEW challenge_overview AS
SELECT
  c.*,
  (CURRENT_DATE - c.start_date)::INT AS days_elapsed,
  (c.end_date - CURRENT_DATE)::INT   AS days_remaining,
  COUNT(cp.id)                        AS participant_count,
  COUNT(cp.id) FILTER (WHERE cp.status = 'active')    AS active_count,
  COUNT(cp.id) FILTER (WHERE cp.status = 'completed') AS completed_count,
  COUNT(cp.id) FILTER (WHERE cp.status = 'dropped')   AS dropped_count,
  COUNT(cp.id) FILTER (
    WHERE cp.status = 'active'
    AND (cp.last_checkin IS NULL OR cp.last_checkin < CURRENT_DATE - 2)
  ) AS needs_checkin_count
FROM challenges c
LEFT JOIN challenge_participants cp ON cp.challenge_id = c.id
GROUP BY c.id;

-- Seed: one active challenge (21-day March 2026)
INSERT INTO challenges (name, description, type, start_date, end_date, status, color)
VALUES (
  '21-Day Spring Challenge 2026',
  'Hydratatie, shake, beweging en mindset — 21 dagen transformatie',
  '21day',
  '2026-03-03',
  '2026-03-23',
  'active',
  '#10b981'
)
ON CONFLICT DO NOTHING;
