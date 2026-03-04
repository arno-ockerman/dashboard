CREATE TABLE IF NOT EXISTS llm_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL,
  model text NOT NULL,
  provider text NOT NULL,
  agent_name text DEFAULT 'jarvis',
  session_type text DEFAULT 'manual',
  calls int DEFAULT 0,
  input_tokens bigint DEFAULT 0,
  output_tokens bigint DEFAULT 0,
  total_tokens bigint DEFAULT 0,
  estimated_cost_usd numeric(10,4) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(date, model, agent_name, session_type)
);
