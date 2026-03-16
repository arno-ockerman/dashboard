export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? '' : Array.isArray(v) ? v.join(';') : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ]
  return lines.join('\n')
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'clients'

    let data: Record<string, unknown>[] = []
    let filename = ''

    if (type === 'clients') {
      const { data: clients, error } = await supabaseAdmin
        .from('clients')
        .select('name, email, phone, status, source, tags, notes, created_at')
        .order('created_at', { ascending: false })
      if (error) throw error
      data = (clients || []) as unknown as Record<string, unknown>[]
      filename = `clients-${new Date().toISOString().split('T')[0]}.csv`
    } else if (type === 'tasks') {
      const { data: tasks, error } = await supabaseAdmin
        .from('tasks')
        .select('title, description, assigned_to, priority, status, project, created_at')
        .order('created_at', { ascending: false })
      if (error) throw error
      data = (tasks || []) as unknown as Record<string, unknown>[]
      filename = `tasks-${new Date().toISOString().split('T')[0]}.csv`
    } else if (type === 'content') {
      const { data: posts, error } = await supabaseAdmin
        .from('content_posts')
        .select('title, caption, platform, post_type, status, scheduled_date, assigned_to, tags, created_at')
        .order('scheduled_date', { ascending: true })
      if (error) throw error
      data = (posts || []) as unknown as Record<string, unknown>[]
      filename = `content-posts-${new Date().toISOString().split('T')[0]}.csv`
    }

    const csv = toCSV(data)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
