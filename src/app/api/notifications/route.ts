import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Notification, NotificationType } from '@/types'

// GET /api/notifications
// Query params:
//   unread=true    — only unread
//   type=error     — filter by type
//   limit=50       — max results (default 50)
// Returns: { notifications: Notification[], unreadCount: number }
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const onlyUnread = searchParams.get('unread') === 'true'
  const typeFilter = searchParams.get('type') as NotificationType | null
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200)

  let query = supabaseAdmin
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (onlyUnread) {
    query = query.eq('read', false)
  }

  if (typeFilter && ['success', 'error', 'warning', 'info'].includes(typeFilter)) {
    query = query.eq('type', typeFilter)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Always compute total unread count (regardless of filter)
  const { count: unreadCount } = await supabaseAdmin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('read', false)

  return NextResponse.json({
    notifications: (data ?? []) as Notification[],
    unreadCount: unreadCount ?? 0,
  })
}

// POST /api/notifications
// Body: { type, title, message, source, metadata? }
// Returns: created notification
export async function POST(req: NextRequest) {
  let body: Partial<Notification>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { type, title, message, source, metadata } = body

  if (!type || !title || !message || !source) {
    return NextResponse.json(
      { error: 'type, title, message, and source are required' },
      { status: 400 }
    )
  }

  if (!['success', 'error', 'warning', 'info'].includes(type)) {
    return NextResponse.json(
      { error: 'type must be one of: success, error, warning, info' },
      { status: 400 }
    )
  }

  const { data, error } = await supabaseAdmin
    .from('notifications')
    .insert({ type, title, message, source, metadata: metadata ?? {} })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data as Notification, { status: 201 })
}
