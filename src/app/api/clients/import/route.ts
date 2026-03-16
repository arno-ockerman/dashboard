export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

interface ImportRow {
  name: string
  email?: string
  phone?: string
  source?: string
  status?: string
  tags?: string[]
  notes?: string
}

interface ImportResult {
  created: number
  updated: number
  unchanged: number
  errors: string[]
  details: Array<{ name: string; action: 'created' | 'updated' | 'unchanged'; email?: string }>
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const rows: ImportRow[] = body.rows || []

    if (!rows.length) {
      return NextResponse.json({ error: 'No rows to import' }, { status: 400 })
    }

    const result: ImportResult = {
      created: 0,
      updated: 0,
      unchanged: 0,
      errors: [],
      details: [],
    }

    // Fetch existing clients by email for smart matching
    const emails = rows.filter((r) => r.email).map((r) => r.email as string)
    let existingByEmail: Record<string, { id: string; name: string; email: string }> = {}

    if (emails.length > 0) {
      const { data: existing } = await supabaseAdmin
        .from('clients')
        .select('id, name, email, phone, source, status, tags, notes')
        .in('email', emails)

      if (existing) {
        existingByEmail = Object.fromEntries(existing.map((c) => [c.email, c]))
      }
    }

    // Process each row
    for (const row of rows) {
      try {
        if (!row.name?.trim()) {
          result.errors.push(`Skipped row: missing name`)
          continue
        }

        const payload = {
          name: row.name.trim(),
          email: row.email?.trim() || null,
          phone: row.phone?.trim() || null,
          source: row.source || 'bizworks-import',
          status: row.status || 'lead',
          tags: row.tags || ['bizworks-import'],
          notes: row.notes?.trim() || null,
          imported_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        if (row.email && existingByEmail[row.email]) {
          // Update existing client
          const existing = existingByEmail[row.email]
          const { error } = await supabaseAdmin
            .from('clients')
            .update(payload)
            .eq('id', existing.id)

          if (error) {
            result.errors.push(`Error updating ${row.name}: ${error.message}`)
          } else {
            result.updated++
            result.details.push({ name: row.name, action: 'updated', email: row.email })
          }
        } else {
          // Insert new client
          const { error } = await supabaseAdmin.from('clients').insert(payload)

          if (error) {
            result.errors.push(`Error inserting ${row.name}: ${error.message}`)
          } else {
            result.created++
            result.details.push({ name: row.name, action: 'created', email: row.email })
          }
        }
      } catch (rowError) {
        result.errors.push(`Error processing ${row.name}: ${String(rowError)}`)
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
