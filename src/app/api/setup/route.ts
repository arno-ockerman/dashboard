export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import fs from 'fs'
import path from 'path'

export async function POST() {
  try {
    const schemaPath = path.join(process.cwd(), 'src/lib/schema.sql')
    const sql = fs.readFileSync(schemaPath, 'utf-8')
    
    // Execute each statement
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'))

    const results = []
    for (const statement of statements) {
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql: statement })
      if (error) {
        results.push({ statement: statement.substring(0, 50), error: error.message })
      } else {
        results.push({ statement: statement.substring(0, 50), success: true })
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
