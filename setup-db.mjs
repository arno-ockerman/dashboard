import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = 'https://uldlxqyqmpjznmnokbjz.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsZGx4cXlxbXBqem5tbm9rYmp6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY4NTI1NCwiZXhwIjoyMDg3MjYxMjU0fQ.4d0AAe1dXPIJ66unKgc9UGaVnmXAPcU893HYaTjkJLE'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

// Create tables by trying to insert/select and checking if they exist
const tables = [
  'clients',
  'interactions', 
  'sales',
  'goals',
  'habits',
  'habit_logs',
  'knowledge',
  'content',
]

console.log('🔍 Checking existing tables...')
for (const table of tables) {
  const { error } = await supabase.from(table).select('*').limit(1)
  if (error) {
    if (error.message.includes('relation') || error.message.includes('does not exist')) {
      console.log(`❌ Table ${table} does not exist`)
    } else {
      console.log(`✅ Table ${table} exists (or other error: ${error.message})`)
    }
  } else {
    console.log(`✅ Table ${table} exists`)
  }
}

console.log('\n📋 Schema SQL to run in Supabase SQL Editor:')
console.log('URL: https://supabase.com/dashboard/project/uldlxqyqmpjznmnokbjz/sql/new')
const schema = readFileSync(join(__dirname, 'src/lib/schema.sql'), 'utf-8')
console.log('\n' + schema)
