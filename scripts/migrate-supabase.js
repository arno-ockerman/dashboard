#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const raw = fs.readFileSync(filePath, 'utf8')
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    let value = trimmed.slice(idx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

function splitSqlStatements(sql) {
  const statements = []
  let current = ''
  let i = 0
  let inSingle = false
  let inDouble = false
  let dollarTag = null

  while (i < sql.length) {
    const ch = sql[i]
    const next = sql[i + 1]

    if (!inDouble && ch === "'" && sql[i - 1] !== '\\' && !dollarTag) {
      inSingle = !inSingle
      current += ch
      i += 1
      continue
    }

    if (!inSingle && ch === '"' && sql[i - 1] !== '\\' && !dollarTag) {
      inDouble = !inDouble
      current += ch
      i += 1
      continue
    }

    if (!inSingle && !inDouble && ch === '$') {
      const rest = sql.slice(i)
      const m = rest.match(/^\$[A-Za-z0-9_]*\$/)
      if (m) {
        const tag = m[0]
        if (dollarTag === tag) {
          dollarTag = null
        } else if (!dollarTag) {
          dollarTag = tag
        }
        current += tag
        i += tag.length
        continue
      }
    }

    if (!inSingle && !inDouble && !dollarTag && ch === '-' && next === '-') {
      while (i < sql.length && sql[i] !== '\n') i += 1
      current += '\n'
      continue
    }

    if (!inSingle && !inDouble && !dollarTag && ch === ';') {
      const s = current.trim()
      if (s) statements.push(s)
      current = ''
      i += 1
      continue
    }

    current += ch
    i += 1
  }

  const tail = current.trim()
  if (tail) statements.push(tail)

  return statements
}

async function main() {
  loadEnvFile(path.join(process.cwd(), '.env.local'))
  loadEnvFile(path.join(process.cwd(), '.env'))

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    console.error('Missing env vars: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const supabaseAdmin = createClient(url, serviceKey)

  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  console.log(`Found ${files.length} migration files`)

  const results = []

  for (const file of files) {
    const fullPath = path.join(migrationsDir, file)
    const sql = fs.readFileSync(fullPath, 'utf8')
    const statements = splitSqlStatements(sql)
    console.log(`\n==> ${file}: ${statements.length} statements`)

    for (const statement of statements) {
      const preview = statement.split('\n')[0].slice(0, 80)
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql: statement })
      if (error) {
        results.push({ file, preview, ok: false, error: error.message, code: error.code })
        console.error(`ERR ${file}: ${preview} -> ${error.code || ''} ${error.message}`)
      } else {
        results.push({ file, preview, ok: true })
      }
    }
  }

  const failures = results.filter((r) => !r.ok)
  console.log(`\nDone. OK: ${results.length - failures.length}, Failed: ${failures.length}`)
  if (failures.length) process.exit(2)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

