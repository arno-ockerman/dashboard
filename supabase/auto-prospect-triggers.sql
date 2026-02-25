-- ============================================
-- AUTO-PROSPECT TRIGGERS
-- Automatisch een prospect aanmaken in clients
-- wanneer een contact form of mealplanner lead binnenkomt
-- ============================================

-- Function: Create client from contact_submissions
CREATE OR REPLACE FUNCTION create_client_from_contact()
RETURNS TRIGGER AS $$
BEGIN
  -- Check of email al bestaat in clients
  IF NOT EXISTS (SELECT 1 FROM clients WHERE email = NEW.email) THEN
    INSERT INTO clients (name, email, phone, status, tags, source, notes, next_follow_up, next_action)
    VALUES (
      NEW.name,
      NEW.email,
      NEW.phone,
      'lead',
      ARRAY['website-contact']::TEXT[],
      'website',
      COALESCE('Onderwerp: ' || NEW.topic || CASE WHEN NEW.message IS NOT NULL THEN E'\n' || NEW.message ELSE '' END, ''),
      CURRENT_DATE + INTERVAL '1 day',
      'Eerste contact opnemen - ' || COALESCE(NEW.topic, 'website contact')
    );
  ELSE
    -- Update bestaande client met nieuwe interactie info
    UPDATE clients 
    SET notes = COALESCE(notes, '') || E'\n\n[' || TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI') || '] Nieuw contact via website: ' || COALESCE(NEW.topic, '') || ' - ' || COALESCE(NEW.message, ''),
        updated_at = NOW()
    WHERE email = NEW.email;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Create client from mealplanner_leads
CREATE OR REPLACE FUNCTION create_client_from_mealplanner()
RETURNS TRIGGER AS $$
DECLARE
  goal_text TEXT;
  diet_text TEXT;
BEGIN
  -- Vertaal goal naar leesbare tekst
  goal_text := CASE NEW.goal
    WHEN 'weight_loss' THEN 'Afvallen'
    WHEN 'muscle' THEN 'Spiermassa opbouwen'
    WHEN 'maintenance' THEN 'Gewicht behouden'
    ELSE NEW.goal
  END;
  
  -- Haal dieet info uit preferences
  diet_text := COALESCE(NEW.preferences->>'diet', 'none');
  
  -- Check of email al bestaat in clients
  IF NOT EXISTS (SELECT 1 FROM clients WHERE email = NEW.email) THEN
    INSERT INTO clients (name, email, status, tags, source, notes, next_follow_up, next_action)
    VALUES (
      SPLIT_PART(NEW.email, '@', 1),  -- Gebruik email prefix als naam (wordt later bijgewerkt)
      NEW.email,
      'lead',
      ARRAY['mealplanner', 'website']::TEXT[],
      'website',
      'Mealplanner lead - Doel: ' || goal_text || ', Dieet: ' || diet_text || ', Maaltijden/dag: ' || COALESCE(NEW.preferences->>'mealsPerDay', '?'),
      CURRENT_DATE + INTERVAL '1 day',
      'Mealplanner follow-up - interesse in ' || goal_text
    );
  ELSE
    -- Update bestaande client
    UPDATE clients 
    SET tags = ARRAY(SELECT DISTINCT unnest(tags || ARRAY['mealplanner']::TEXT[])),
        notes = COALESCE(notes, '') || E'\n\n[' || TO_CHAR(NOW(), 'YYYY-MM-DD HH24:MI') || '] Mealplanner aangevraagd - Doel: ' || goal_text,
        updated_at = NOW()
    WHERE email = NEW.email;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Na elke nieuwe contact_submissions
DROP TRIGGER IF EXISTS auto_create_prospect_from_contact ON contact_submissions;
CREATE TRIGGER auto_create_prospect_from_contact
  AFTER INSERT ON contact_submissions
  FOR EACH ROW
  EXECUTE FUNCTION create_client_from_contact();

-- Trigger: Na elke nieuwe mealplanner_leads
DROP TRIGGER IF EXISTS auto_create_prospect_from_mealplanner ON mealplanner_leads;
CREATE TRIGGER auto_create_prospect_from_mealplanner
  AFTER INSERT ON mealplanner_leads
  FOR EACH ROW
  EXECUTE FUNCTION create_client_from_mealplanner();

-- ============================================
-- IMPORT BESTAANDE LEADS (eenmalig)
-- Importeer bestaande contact_submissions en 
-- mealplanner_leads die nog niet in clients staan
-- ============================================

-- Import bestaande contact submissions
INSERT INTO clients (name, email, phone, status, tags, source, notes, next_follow_up, next_action)
SELECT 
  cs.name,
  cs.email,
  cs.phone,
  'lead',
  ARRAY['website-contact']::TEXT[],
  'website',
  'Onderwerp: ' || COALESCE(cs.topic, '?') || CASE WHEN cs.message IS NOT NULL THEN E'\n' || cs.message ELSE '' END,
  CURRENT_DATE + INTERVAL '1 day',
  'Eerste contact opnemen - ' || COALESCE(cs.topic, 'website contact')
FROM contact_submissions cs
WHERE NOT EXISTS (SELECT 1 FROM clients c WHERE c.email = cs.email)
ON CONFLICT DO NOTHING;

-- Import bestaande mealplanner leads
INSERT INTO clients (name, email, status, tags, source, notes, next_follow_up, next_action)
SELECT 
  SPLIT_PART(ml.email, '@', 1),
  ml.email,
  'lead',
  ARRAY['mealplanner', 'website']::TEXT[],
  'website',
  'Mealplanner lead - Doel: ' || CASE ml.goal 
    WHEN 'weight_loss' THEN 'Afvallen'
    WHEN 'muscle' THEN 'Spiermassa opbouwen'
    WHEN 'maintenance' THEN 'Gewicht behouden'
    ELSE ml.goal END,
  CURRENT_DATE + INTERVAL '1 day',
  'Mealplanner follow-up'
FROM mealplanner_leads ml
WHERE NOT EXISTS (SELECT 1 FROM clients c WHERE c.email = ml.email)
ON CONFLICT DO NOTHING;
