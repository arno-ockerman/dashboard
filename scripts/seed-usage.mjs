#!/usr/bin/env node
/**
 * seed-usage.mjs
 * Reads all JSONL cron run files and inserts aggregated daily usage data into Supabase llm_usage table.
 * Run: node scripts/seed-usage.mjs
 */

import { readdir, readFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Dynamic import for CJS supabase module
const { createClient } = await import('/home/node/.openclaw/workspace/dashboard/node_modules/@supabase/supabase-js/dist/index.cjs', { assert: { type: 'json' } }).catch(() =>
  import('/home/node/.openclaw/workspace/dashboard/node_modules/@supabase/supabase-js/dist/index.cjs')
)

// ─── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://uldlxqyqmpjznmnokbjz.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsZGx4cXlxbXBqem5tbm9rYmp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY4NTI1NCwiZXhwIjoyMDg3MjYxMjU0fQ.4d0AAe1dXPIJ66unKgc9UGaVnmXAPcU893HYaTjkJLE'
const LOG_DIR = '/home/node/.openclaw/cron/runs'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function parseNumericValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function normalizeProvider(value, model) {
  const lowerValue = (value ?? '').toLowerCase()
  if (lowerValue === 'anthropic' || lowerValue === 'openai' || lowerValue === 'google') return lowerValue
  const lowerModel = model.toLowerCase()
  if (lowerModel.startsWith('claude')) return 'anthropic'
  if (lowerModel.startsWith('gpt')) return 'openai'
  return 'google'
}

function getPricing(model) {
  const lowerModel = model.toLowerCase()
  if (lowerModel === 'claude-opus-4-6') return { inputPerMillion: 15, outputPerMillion: 75 }
  if (lowerModel === 'claude-sonnet-4-6' || lowerModel === 'claude-sonnet-4-5') return { inputPerMillion: 3, outputPerMillion: 15 }
  if (lowerModel === 'gpt-5.3-codex' || lowerModel === 'gpt-5.2-codex') return { inputPerMillion: 2, outputPerMillion: 8 }
  if (lowerModel.startsWith('gemini-')) return { inputPerMillion: 0.35, outputPerMillion: 1.05 }
  return { inputPerMillion: 0, outputPerMillion: 0 }
}

function estimateCost(model, inputTokens, outputTokens) {
  const pricing = getPricing(model)
  return (inputTokens / 1_000_000) * pricing.inputPerMillion + (outputTokens / 1_000_000) * pricing.outputPerMillion
}

let files
try {
  files = (await readdir(LOG_DIR)).filter(f => f.endsWith('.jsonl')).sort()
} catch (err) {
  console.error(`❌ Cannot read directory: ${err.message}`)
  process.exit(1)
}

console.log(`📄 Found ${files.length} JSONL files`)

// Aggregate by date + model (use map to deduplicate)
const buckets = new Map() // key: "date|model"

for (const file of files) {
  const fullPath = path.join(LOG_DIR, file)
  const content = await readFile(fullPath, 'utf8')
  const lines = content.split('\n').filter(l => l.trim())

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line)
      if (typeof parsed.model !== 'string' || !parsed.usage) continue

      const timestamp = parseNumericValue(parsed.ts) || parseNumericValue(parsed.runAtMs) || parseNumericValue(parsed.timestamp)
      if (!timestamp) continue

      const date = new Date(timestamp).toISOString().split('T')[0]
      const model = parsed.model
      const provider = normalizeProvider(typeof parsed.provider === 'string' ? parsed.provider : null, model)

      const inputTokens = parseNumericValue(parsed.usage.input_tokens)
      const outputTokens = parseNumericValue(parsed.usage.output_tokens)
      // Use real token count (input + output), not the context window
      const realTotal = inputTokens + outputTokens

      const key = `${date}|${model}`
      const existing = buckets.get(key) || {
        date, model, provider, calls: 0,
        input_tokens: 0, output_tokens: 0, total_tokens: 0, estimated_cost_usd: 0
      }

      existing.calls += 1
      existing.input_tokens += inputTokens
      existing.output_tokens += outputTokens
      existing.total_tokens += realTotal
      existing.estimated_cost_usd += estimateCost(model, inputTokens, outputTokens)

      buckets.set(key, existing)
    } catch {
      // skip malformed lines
    }
  }
}

const rows = Array.from(buckets.values()).map(row => ({
  date: row.date,
  model: row.model,
  provider: row.provider,
  agent_name: 'jarvis',
  session_type: 'cron',
  calls: row.calls,
  input_tokens: row.input_tokens,
  output_tokens: row.output_tokens,
  total_tokens: row.total_tokens,
  estimated_cost_usd: Number(row.estimated_cost_usd.toFixed(6))
}))

console.log(`📊 Aggregated ${rows.length} model/day combinations`)

if (rows.length === 0) {
  console.log('⚠️  No usage data found')
  process.exit(0)
}

// Clear existing data and re-insert
const { error: delErr } = await supabase.from('llm_usage').delete().neq('id', '00000000-0000-0000-0000-000000000000')
if (delErr) {
  console.warn('⚠️  Could not clear existing data:', delErr.message)
}

// Insert in batches
const batchSize = 50
let inserted = 0
for (let i = 0; i < rows.length; i += batchSize) {
  const batch = rows.slice(i, i + batchSize)
  const { data: ins, error } = await supabase.from('llm_usage').insert(batch).select('id')
  if (error) {
    console.error(`❌ Insert error (batch ${Math.floor(i / batchSize) + 1}):`, error.message)
  } else {
    inserted += ins?.length ?? 0
  }
}

console.log(`✅ Inserted ${inserted} rows into llm_usage`)

// Verify
const { data: check } = await supabase.from('llm_usage').select('date, model, calls, total_tokens, estimated_cost_usd').order('date', { ascending: false }).limit(5)
console.log('\n📈 Recent data in Supabase:')
check?.forEach(row => {
  console.log(`  ${row.date} | ${row.model} | ${row.calls} calls | ${row.total_tokens} tokens | $${row.estimated_cost_usd}`)
})
