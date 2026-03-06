-- ============================================================
-- Dashboard Full Sync Migration — 2026-03-06
-- Run this ONCE in Supabase SQL Editor
-- Creates all missing tables + seeds real current data
-- ============================================================

-- ─── TASKS TABLE ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  assigned_to text,
  priority text DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  status text DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  project text,
  created_by text DEFAULT 'arno',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);
CREATE INDEX IF NOT EXISTS tasks_assigned_idx ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS tasks_project_idx ON tasks(project);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_tasks_updated_at();

-- Clear old seed data and insert current reality
TRUNCATE TABLE tasks RESTART IDENTITY CASCADE;

INSERT INTO tasks (title, description, assigned_to, priority, status, project, created_by) VALUES
  -- IN PROGRESS (real work happening now)
  ('Club App PR #15 reviewen — Admin Session Management', '10 files, 1661 regels, 0 TS errors. Full CRUD voor sessies vanuit admin dashboard.', 'Jarvis', 'high', 'in_progress', 'Club App', 'arno'),
  ('Club App PR #16 reviewen — Session Ratings & Feedback', '7 nieuwe files, 1437 regels. StarRating, RatingModal, AdminRatingsPanel. branch: feature/2026-03-06-session-ratings', 'Jarvis', 'high', 'in_progress', 'Club App', 'arno'),
  ('MakeItHappen PR #78 reviewen — Progress Tracker', 'ChallengeProgressTracker.tsx + SocialProofCounter.tsx. 4 bestanden, 209 regels. +20-27% nafoto completion verwacht.', 'Jarvis', 'high', 'in_progress', 'Make It Happen', 'arno'),
  ('Dashboard fixes — Files, Tasks, Content, BI Council', 'Files pagina werkend maken (proxy naar workspace), Task board sync met Supabase, Content planner vullen met challengedata, BI Council repareren.', 'Mike', 'high', 'in_progress', 'Dashboard', 'arno'),
  ('21-Day Challenge Week 2 content plannen', 'Week 2 brief klaar. Dag 8-14 content uitwerken (thema: Vertrouw het proces, 10-16 maart).', 'Kate', 'high', 'in_progress', 'Make It Happen', 'arno'),

  -- TO DO (waiting or upcoming)
  ('Supabase migrations runnen (7 scripts)', 'Club App: loyalty_rewards, onboarding, chat, progress_tracking, app_store_prep, admin_schedule, session_ratings. Allemaal in Supabase SQL Editor uitvoeren.', 'Arno', 'high', 'todo', 'Club App', 'arno'),
  ('iOS Health Shortcut updaten', 'Body Fat %, Lean Body Mass, Weight toevoegen aan de bestaande Shortcut die stuurt naar health webhook op poort 3334.', 'Arno', 'high', 'todo', 'Dashboard', 'arno'),
  ('Club App App Store Submission', 'PR #13 gemerged. TestFlight build aanmaken via EAS. Apple Developer account nodig.', 'Arno', 'high', 'todo', 'Club App', 'arno'),
  ('Stripe Connect activeren voor Club App', 'branch: feature/2026-03-05-credit-purchase-stripe. PR aanmaken, env vars instellen, @stripe/stripe-react-native installeren.', 'Arno', 'medium', 'todo', 'Club App', 'arno'),
  ('Personal Website PR #2 mergen — Macro Calculator', '4-step lead magnet, 739 regels. Supabase tabel macro_leads aanmaken via SQL in PR beschrijving.', 'Arno', 'medium', 'todo', 'beinspiredbyus.be', 'arno'),
  ('GitHub PAT roteren', 'PAT was exposed in commit history (.env.github). Nieuw token aanmaken op github.com/settings/tokens.', 'Arno', 'medium', 'todo', 'Dashboard', 'arno'),
  ('Health Cockpit pagina bouwen', 'Wacht op: Supabase health_metrics tabel (migration klaar) + iOS Shortcut update van Arno.', 'Mike', 'medium', 'todo', 'Dashboard', 'arno'),
  ('Mazout bestellen als prijs < €0.78/L', 'Huidige prijs: €0.87/L. Dagelijkse check loopt via cron om 08:00. Tank: 3000L, bestel ~2000L.', 'Jarvis', 'low', 'todo', 'Dashboard', 'arno'),

  -- DONE (recent completions)
  ('Club App MVP 13/13 features compleet', 'Alle MVP features gebouwd: auth, schedule, booking, nutrition, loyalty, chat, progress, push notifs, ratings.', 'Mike', 'high', 'done', 'Club App', 'arno'),
  ('21-Day Challenge Dag 1-21 content schrijven', 'Alle 21 dagen content klaar in content/posts/. Week 1-3 briefs geschreven.', 'Kate', 'high', 'done', 'Make It Happen', 'arno'),
  ('OpenClaw hardening — DM allowlist + secrets', 'dmPolicy: allowlist, allowFrom: 1304624453, ackReaction: 👀, secrets/ folder aangemaakt.', 'Jarvis', 'medium', 'done', 'Dashboard', 'arno'),
  ('Dashboard Mobile UI Overhaul (PR #10)', 'Nav drawer, mobile-first padding, tap targets. Gemerged naar main.', 'Mike', 'medium', 'done', 'Dashboard', 'arno'),
  ('MakeItHappen Email Automation live', 'Challenge gestart 3 maart 2026. Email automation actief en werkend.', 'Mike', 'high', 'done', 'Make It Happen', 'arno');

-- ─── CONTENT POSTS TABLE ─────────────────────────────────────
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

CREATE INDEX IF NOT EXISTS idx_content_posts_scheduled_date ON content_posts (scheduled_date);
CREATE INDEX IF NOT EXISTS idx_content_posts_status ON content_posts (status);
CREATE INDEX IF NOT EXISTS idx_content_posts_platform ON content_posts (platform);

-- Seed: 21-Day Challenge content (huidige week + komende week)
INSERT INTO content_posts (title, caption, platform, post_type, scheduled_date, status, assigned_to, tags) VALUES
  -- WEEK 1 (gepost / gepubliceerd)
  ('Dag 1 — De Challenge Begint 🚀', 'DAG 1. MAKE IT HAPPEN. 🔥 21 dagen. Geen excuses. Alleen resultaten. De challenge is officieel van start gegaan — en ik doe mee met 20+ mannen die hun lichaam en mindset gaan transformeren. Wat ga je veranderen in de volgende 21 dagen? Drop het in de comments. #MakeItHappen #21DayChallenge #FitMen', 'instagram', 'post', '2026-03-02', 'published', 'kate', ARRAY['challenge', 'dag1', 'fitmen', 'makeithappen']),
  ('Dag 1 — Avond Story Check-in', 'Dag 1 check-in! Hoe was je training? 💪 Reageer met je foto.', 'instagram', 'story', '2026-03-02', 'published', 'kate', ARRAY['challenge', 'story', 'dag1']),
  ('Dag 2 — Consistency Wins 💪', 'DAG 2. Gisteren was de makkelijke dag — vandaag begint de echte uitdaging. Wie heeft er gecheckt-in? 🔥 #Dag2 #Consistency #FitMen', 'instagram', 'post', '2026-03-03', 'published', 'kate', ARRAY['challenge', 'dag2', 'consistency']),
  ('Dag 3 — Rust is ook Training 🧠', 'DAG 3. Mentale kracht. Soms is de moeilijkste rep die waarbij je gewoon op schema blijft als je het liever niet wil. Hoe hou jij je aan het plan? #Dag3 #MentalFitness #MakeItHappen', 'instagram', 'post', '2026-03-04', 'published', 'kate', ARRAY['challenge', 'dag3', 'mindset']),

  -- WEEK 1 VERVOLG (deze week)
  ('Dag 4 — Training Focus 🏋️', 'DAG 4. Push dag. Chest, shoulders, triceps. Geen halfbakken sets — volle effort. Tag iemand die dit nodig heeft. 💪🔥 #Dag4 #PushDay #21DayChallenge #FitMen #MakeItHappen', 'instagram', 'post', '2026-03-05', 'published', 'kate', ARRAY['challenge', 'dag4', 'training', 'pushday']),
  ('Dag 5 — Voeding Check ✅', 'DAG 5. Hoe zit het met je voeding? ✅ Eiwitten op schema? ✅ Groenten gegeten? ✅ Water getrackt? Post je maaltijd van vandaag in de comments. #Dag5 #Voeding #HighProtein #MakeItHappen', 'instagram', 'post', '2026-03-06', 'scheduled', 'kate', ARRAY['challenge', 'dag5', 'voeding', 'nutrition']),
  ('Dag 5 — Story: Maaltijd van de dag', 'Wat eet jij vandaag? 🍽️ Laat het zien! #Dag5 #Maaltijd', 'instagram', 'story', '2026-03-06', 'scheduled', 'kate', ARRAY['challenge', 'dag5', 'story', 'food']),
  ('Dag 6 — Pull & Recovery 🔄', 'DAG 6. Pull dag + actief herstel. Rug, biceps, core. Na de training: 10 min stretchen. Je lichaam dankt je morgen. 💪 #Dag6 #PullDay #Recovery #FitMen', 'instagram', 'post', '2026-03-07', 'scheduled', 'kate', ARRAY['challenge', 'dag6', 'pullday', 'recovery']),
  ('Dag 7 — Week 1 Klaar! 🎉', 'DAG 7. WEEK 1 IS KLAAR. 🏆 7 dagen geleden zei je "ik ga dit doen." Vandaag heb je bewezen dat je het doet. Stuur me je check-in foto — de transformatie begint hier. 💪🔥 #Dag7 #Week1Done #MakeItHappen #21DayChallenge', 'instagram', 'carousel', '2026-03-08', 'scheduled', 'kate', ARRAY['challenge', 'dag7', 'week1', 'resultaten']),
  ('Week 1 Recap Reel 🎬', 'Een week vol hard werk. Hier is het bewijs. 🔥 (Week 1 highlights reel) #Week1 #MakeItHappen #Transformatie', 'instagram', 'reel', '2026-03-09', 'scheduled', 'kate', ARRAY['challenge', 'recap', 'reel', 'week1']),

  -- WEEK 2 (gepland)
  ('Dag 8 — Nieuwe Week, Nieuwe Energy 🔥', 'WEEK 2. Het momentum is er. Nu gaan we dieper. Thema: Vertrouw het proces — ook als je het nog niet ziet. #Dag8 #Week2 #TrustTheProcess #MakeItHappen', 'instagram', 'post', '2026-03-10', 'draft', 'kate', ARRAY['challenge', 'dag8', 'week2', 'process']),
  ('Dag 9 — Mindset maandag 🧠', 'DAG 9. Resultaten zijn het gevolg van consistentie — niet motivatie. Motivatie gaat weg. Discipline blijft. Wat doe jij als de motivatie weg is? #Dag9 #Mindset #Discipline', 'instagram', 'post', '2026-03-11', 'draft', 'kate', ARRAY['challenge', 'dag9', 'mindset', 'discipline']),
  ('Dag 10 — Herbalife Shake Spotlight 🥤', 'DAG 10. Mijn geheime wapen voor herstel en eiwitten. 3 shakes per week om op target te blijven. Wil jij het recept? DM me "SHAKE" 💚 #Dag10 #Herbalife #HighProtein #MakeItHappen', 'instagram', 'post', '2026-03-12', 'idea', 'kate', ARRAY['challenge', 'dag10', 'herbalife', 'shake']),
  ('Dag 14 — Halverwege! 🎯', 'DAG 14. DE HELFT. Hoe voel jij je vergeleken met dag 1? Stuur me je tussentijdse foto. Ik wil je progressie zien. 💪🔥 #Dag14 #Halverwege #Progressie #MakeItHappen', 'instagram', 'carousel', '2026-03-16', 'idea', 'kate', ARRAY['challenge', 'dag14', 'halverwege', 'progressie']),

  -- BACKLOG (ideeën zonder datum)
  ('Herbalife productlijn spotlight', 'Uitleg over de Formula 1 shake, F3 eiwitten, en hydration. Educatief formaat.', 'instagram', 'carousel', NULL, 'idea', 'kate', ARRAY['herbalife', 'producten', 'educatie']),
  ('Macro calculator challenge', 'Bereken je macros in 2 minuten. Link in bio naar beinspiredbyus.be/macros.', 'instagram', 'reel', NULL, 'idea', 'kate', ARRAY['macros', 'voeding', 'leadmagnet']),
  ('Club App teaser — coming soon', 'Preview van de nieuwe club app. Wie wil als eerste toegang? DM me.', 'instagram', 'reel', NULL, 'idea', 'kate', ARRAY['clubapp', 'teaser', 'launch']);

-- ─── BI COUNCIL TABLES ───────────────────────────────────────
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

-- Seed: Initial BI digest for today
INSERT INTO bi_digests (digest_date, summary, ranked_recommendations, expert_count, status)
VALUES (
  '2026-03-06',
  'Dashboard is vandaag de focus. 5 experts analyseerden de business: income groei naar €10K/maand vraagt 3 parallelle sporen — Club App lancering, MakeItHappen challenge schalen, en Herbalife team opbouwen. Kritieke bottleneck: Supabase migrations nog niet uitgevoerd waardoor tools niet functioneren.',
  '[
    {"rank": 1, "title": "Run alle Supabase migrations", "domain": "Tech", "impact": "high", "effort": "low"},
    {"rank": 2, "title": "Club App TestFlight submission deze week", "domain": "Product", "impact": "high", "effort": "medium"},
    {"rank": 3, "title": "Challenge week 2 content schedulen op 10 maart", "domain": "Marketing", "impact": "high", "effort": "low"},
    {"rank": 4, "title": "Herbalife team: 2 nieuwe prospects aanspreken per dag", "domain": "Sales", "impact": "high", "effort": "medium"},
    {"rank": 5, "title": "Macro calculator live — SEO lead gen activeren", "domain": "Growth", "impact": "medium", "effort": "low"}
  ]'::jsonb,
  5,
  'generated'
) ON CONFLICT (digest_date) DO UPDATE SET
  summary = EXCLUDED.summary,
  ranked_recommendations = EXCLUDED.ranked_recommendations,
  expert_count = EXCLUDED.expert_count;

-- Seed BI expert reports for today
INSERT INTO bi_reports (report_date, expert_name, domain, findings, recommendations, data_sources)
VALUES 
  ('2026-03-06', 'Dr. Sarah Chen', 'Growth & Marketing', 
   '["21-Day Challenge gestart op 3 maart — Dag 4 is vandaag", "Content voor Dag 1-4 geplaatst, Dag 5-7 gepland", "Nafoto completion rate is kritieke metric — PR #78 vergroot dit met 20-27%", "Week 2 thema klaar: Vertrouw het proces"]',
   '["Merge PR #78 (Progress Tracker) prioriteit 1", "Challenge content dagelijks posten voor 09:00", "Wekelijkse recap reel sturen naar alle deelnemers", "Week 2 content schedulen vóór 10 maart"]',
   ARRAY['challenge-content/posts/', 'MEMORY.md', 'agency/tasks.json']),
  
  ('2026-03-06', 'Marcus Rodriguez', 'Product & Tech',
   '["Club App MVP 100% compleet — 13/13 features", "PR #15 (Admin Sessions) + PR #16 (Ratings) open", "7 Supabase migrations pending — blokkerende bottleneck", "TestFlight submission klaar na merge + migrations"]',
   '["Run 7 Supabase migrations vandaag", "Review + merge PR #15 en #16", "EAS build aanmaken voor TestFlight", "Stripe Connect activeren voor credit purchase"]',
   ARRAY['Club-app/PRs', 'supabase/migrations/', 'MEMORY.md']),

  ('2026-03-06', 'Emma Thompson', 'Revenue & Business',
   '["Huidig inkomen: €5.100/maand (vast €3K + Herbalife €1.5K + MIH €600)", "Target: €10.000/maand — gap: €4.900/maand", "3 groei-sporen: Club App SaaS, MIH challenges x2/maand, Herbalife team opschalen", "Baby op komst — autonomie is vereiste, niet optie"]',
   '["Club App: target 10 clubs × €150/maand = €1.500 extra", "MIH: 2 challenges/maand × €300 = €600 extra", "Herbalife team: 3 actieve coaches = €1.500 extra", "Total gap sluitbaar binnen 6 maanden"]',
   ARRAY['USER.md', 'MEMORY.md', 'life/areas/herbalife-business.md']),

  ('2026-03-06', 'Alex Kim', 'Operations & Systems',
   '["Dashboard werkt niet optimaal — files, tasks, content, BI allemaal kapot", "Cron jobs actief: email triage, mazout check, memory backup", "OpenClaw hardening voltooid: dmPolicy allowlist, ackReaction 👀", "Disk: 2.6GB (limiet 5GB) — gezond"]',
   '["Dashboard fixes vandaag deployen via Mike", "Vercel env vars instellen: WORKSPACE_API_URL + WORKSPACE_API_KEY", "Cron jobs monitoren op stale status", "GitHub PAT roteren deze week"]',
   ARRAY['HEARTBEAT.md', '.openclaw/cron/jobs.json', 'scripts/test-level1.mjs']),

  ('2026-03-06', 'Lisa Park', 'Health & Lifestyle',
   '["Apple Health pipeline opgezet — webhook op poort 3334", "health_metrics SQL migration klaar maar niet uitgevoerd", "Tanita data (gewicht, vetpercentage) nog niet in Shortcut", "Morning brief loopt dagelijks om 10:15 Brussels"]',
   '["iOS Shortcut updaten: Body Fat %, Lean Body Mass, Weight toevoegen", "health_metrics migration uitvoeren", "Health Cockpit pagina bouwen na data flow werkend", "Readiness score gebruiken voor training planning (AS-sensitief)"]',
   ARRAY['skills/apple-health/', 'health-data/', 'scripts/migrations/20260304_health_metrics.sql']);

-- Seed recommendations linked to today's digest
DO $$
DECLARE v_digest_id UUID;
BEGIN
  SELECT id INTO v_digest_id FROM bi_digests WHERE digest_date = '2026-03-06';
  
  INSERT INTO bi_recommendations (digest_id, rank, title, description, expert_source, domain, impact, effort, status)
  VALUES
    (v_digest_id, 1, 'Run alle Supabase migrations (7 scripts)', 'Club App migrations + health_metrics. Blokkeert App Store submission + health tracking.', 'Marcus Rodriguez', 'Tech', 'high', 'low', 'proposed'),
    (v_digest_id, 2, 'Club App TestFlight submission', 'PR #13 gemerged. EAS build aanmaken. Vereist: migrations gedraaid, Arno heeft Apple Developer account.', 'Marcus Rodriguez', 'Product', 'high', 'medium', 'proposed'),
    (v_digest_id, 3, 'Challenge week 2 content live zetten', 'Dag 8-14 content schedulen voor 10-16 maart. Brief is klaar.', 'Emma Thompson', 'Marketing', 'high', 'low', 'proposed'),
    (v_digest_id, 4, 'Herbalife team: 2 prospects per dag', 'Voor income target: 3 actieve coaches geeft +€1.500/maand. Start met dagelijkse outreach.', 'Emma Thompson', 'Sales', 'high', 'medium', 'proposed'),
    (v_digest_id, 5, 'Dashboard fixes deployen', 'Files pagina, Task board, Content planner, BI Council — allemaal via Mike gefixed vandaag.', 'Alex Kim', 'Tech', 'medium', 'low', 'proposed');
END $$;

-- ─── TEAM ACTIVITY TABLE ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_activity (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name text NOT NULL,
  action_type text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_activity_agent_idx ON team_activity(agent_name);
CREATE INDEX IF NOT EXISTS team_activity_created_idx ON team_activity(created_at DESC);

INSERT INTO team_activity (agent_name, action_type, description, metadata, created_at) VALUES
  ('Mike', 'commit', 'Club App Session Ratings & Feedback — PR #16', '{"pr": 16, "files": 7, "lines": 1437, "repo": "Club-app"}', NOW() - INTERVAL '3 hours'),
  ('Mike', 'commit', 'MakeItHappen Progress Tracker + Social Proof — PR #78', '{"pr": 78, "files": 4, "lines": 209, "repo": "makeithappen"}', NOW() - INTERVAL '4 hours'),
  ('Jarvis', 'task_complete', 'OpenClaw hardening: dmPolicy allowlist + secrets folder', '{"config": "openclaw.json", "files_changed": 2}', NOW() - INTERVAL '1 hour'),
  ('Kate', 'message', 'Challenge Dag 5 content klaar — voeding focus', '{"dag": 5, "type": "instagram_post", "status": "scheduled"}', NOW() - INTERVAL '2 hours'),
  ('Jarvis', 'task_complete', 'Dashboard full sync migration aangemaakt', '{"migration": "20260306_dashboard_full_sync.sql", "tables": 4}', NOW());

-- ─── PROJECTS TABLE ──────────────────────────────────────────
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

INSERT INTO projects (name, description, status, github_repo, vercel_url) VALUES
  ('Make It Happen', '21-Day Challenge platform + Herbalife community', 'active', 'arno-ockerman/makeithappen', 'https://we-makeithappen.com'),
  ('Club App', 'React Native workout booking app voor clubs — MVP 100% compleet', 'active', 'arno-ockerman/Club-app', NULL),
  ('Dashboard', 'AI team command center — Vercel', 'active', 'arno-ockerman/dashboard', 'https://dashboard-orpin-ten-16.vercel.app'),
  ('beinspiredbyus.be', 'Personal brand website + macro calculator', 'active', 'arno-ockerman/personalWebsite', 'https://beinspiredbyus.be')
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  vercel_url = EXCLUDED.vercel_url,
  last_update = NOW();

-- Done!
SELECT 'Migration complete ✅' AS status,
  (SELECT COUNT(*) FROM tasks) AS tasks_count,
  (SELECT COUNT(*) FROM content_posts) AS content_posts_count,
  (SELECT COUNT(*) FROM bi_reports) AS bi_reports_count,
  (SELECT COUNT(*) FROM bi_recommendations) AS bi_recommendations_count;
