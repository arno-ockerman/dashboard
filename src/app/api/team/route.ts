import { NextResponse , NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await withAuth(request)
  if (!auth.authorized) return auth.response!
  try {
    const { data: activities, error } = await supabaseAdmin
      .from('team_activity')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error

    return NextResponse.json({ activities: activities || [] })
  } catch (err) {
    console.error('Team API error:', err)
    return NextResponse.json({ activities: [], error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await withAuth(req)
  if (!auth.authorized) return auth.response!
  try {
    const body = await req.json()
    const { agent_name, action_type, description, metadata } = body

    if (!agent_name || !action_type) {
      return NextResponse.json({ error: 'agent_name and action_type required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('team_activity')
      .insert({ agent_name, action_type, description, metadata: metadata || {} })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ activity: data })
  } catch (err) {
    console.error('Team POST error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
