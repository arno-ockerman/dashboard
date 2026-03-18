import { NextResponse , NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/notifications/mark-all-read
// Marks all unread notifications as read
// Returns: { updated: number }
export async function POST(request: NextRequest) {
  const auth = await withAuth(request)
  if (!auth.authorized) return auth.response!
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .update({ read: true })
    .eq('read', false)
    .select('id')

  if (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ updated: data?.length ?? 0 })
}
