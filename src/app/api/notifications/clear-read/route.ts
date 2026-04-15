import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase-admin'

// POST /api/notifications/clear-read
// Deletes all read notifications
// Returns: { deleted: number }
export async function POST(request: NextRequest) {
  const auth = await withAuth(request)
  if (!auth.authorized) return auth.response!

  const { data, error } = await supabaseAdmin
    .from('notifications')
    .delete()
    .eq('read', true)
    .select('id')

  if (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ deleted: data?.length ?? 0 })
}
