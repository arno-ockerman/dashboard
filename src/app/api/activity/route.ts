import { NextResponse, NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await withAuth(request)
  if (!auth.authorized) return auth.response!

  const { searchParams } = new URL(request.url)
  const agent = searchParams.get('agent')
  const actionType = searchParams.get('action_type')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  try {
    let query = supabaseAdmin
      .from('team_activity')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (agent) {
      query = query.eq('agent_name', agent)
    }
    if (actionType) {
      query = query.eq('action_type', actionType)
    }

    const { data, error, count } = await query

    if (error) throw error

    return NextResponse.json({
      activities: data || [],
      total: count || 0,
      offset,
      limit,
    })
  } catch (err) {
    console.error('Activity API error:', err)
    return NextResponse.json(
      { activities: [], total: 0, offset: 0, limit, error: String(err) },
      { status: 500 }
    )
  }
}
