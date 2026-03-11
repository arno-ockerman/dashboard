import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/notifications/mark-all-read
// Marks all unread notifications as read
// Returns: { updated: number }
export async function POST() {
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .update({ read: true })
    .eq('read', false)
    .select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ updated: data?.length ?? 0 })
}
