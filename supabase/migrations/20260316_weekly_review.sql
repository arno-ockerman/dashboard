-- Weekly Review: reflections journal
-- One row per ISO week (year + week number)

CREATE TABLE IF NOT EXISTS weekly_reflections (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  week_start  DATE NOT NULL UNIQUE,   -- Monday of the week (ISO)
  wins        TEXT,                   -- What went well
  lessons     TEXT,                   -- What to improve
  next_focus  TEXT,                   -- Top priority next week
  score       INTEGER,                -- Cached accountability score (0-100)
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_weekly_reflections_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_weekly_reflections_updated_at ON weekly_reflections;
CREATE TRIGGER trg_weekly_reflections_updated_at
  BEFORE UPDATE ON weekly_reflections
  FOR EACH ROW EXECUTE FUNCTION update_weekly_reflections_updated_at();

-- RLS
ALTER TABLE weekly_reflections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for weekly_reflections" ON weekly_reflections;
CREATE POLICY "Allow all for weekly_reflections"
  ON weekly_reflections FOR ALL
  USING (true)
  WITH CHECK (true);

-- Seed with current week placeholder (optional — remove if unwanted)
-- INSERT INTO weekly_reflections (week_start) VALUES (DATE_TRUNC('week', NOW())::DATE)
-- ON CONFLICT (week_start) DO NOTHING;
