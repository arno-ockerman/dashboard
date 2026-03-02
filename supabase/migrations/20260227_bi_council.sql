-- ============================================================
-- Business Intelligence Council — Migration
-- Created: 2026-02-27
-- ============================================================

-- Expert analysis snapshots
CREATE TABLE IF NOT EXISTS bi_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expert_name TEXT NOT NULL,
  domain TEXT NOT NULL,
  findings JSONB NOT NULL DEFAULT '[]',
  recommendations JSONB NOT NULL DEFAULT '[]',
  data_sources TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bi_reports_date_idx ON bi_reports(report_date DESC);
CREATE INDEX IF NOT EXISTS bi_reports_expert_idx ON bi_reports(expert_name);

-- Synthesized nightly digest
CREATE TABLE IF NOT EXISTS bi_digests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  digest_date DATE NOT NULL UNIQUE DEFAULT CURRENT_DATE,
  summary TEXT,
  ranked_recommendations JSONB NOT NULL DEFAULT '[]',
  expert_count INT DEFAULT 0,
  status TEXT DEFAULT 'generated' CHECK (status IN ('generated', 'reviewed', 'actioned')),
  feedback JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bi_digests_date_idx ON bi_digests(digest_date DESC);

-- Recommendation tracking
CREATE TABLE IF NOT EXISTS bi_recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  digest_id UUID REFERENCES bi_digests(id) ON DELETE CASCADE,
  rank INT,
  title TEXT NOT NULL,
  description TEXT,
  expert_source TEXT,
  domain TEXT,
  impact TEXT CHECK (impact IN ('high', 'medium', 'low')),
  effort TEXT CHECK (effort IN ('high', 'medium', 'low')),
  status TEXT DEFAULT 'proposed' CHECK (status IN ('proposed', 'accepted', 'rejected', 'completed')),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bi_recommendations_digest_idx ON bi_recommendations(digest_id);
CREATE INDEX IF NOT EXISTS bi_recommendations_status_idx ON bi_recommendations(status);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_bi_recommendations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS bi_recommendations_updated_at ON bi_recommendations;
CREATE TRIGGER bi_recommendations_updated_at
  BEFORE UPDATE ON bi_recommendations
  FOR EACH ROW EXECUTE FUNCTION update_bi_recommendations_updated_at();
