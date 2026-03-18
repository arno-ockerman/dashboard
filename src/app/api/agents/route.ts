import { NextResponse , NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const auth = await withAuth(request)
  if (!auth.authorized) return auth.response!
  const { data, error } = await supabaseAdmin
    .from('agent_activity')
    .select('*')

  if (error) return NextResponse.json([], { status: 200 })
  return NextResponse.json(data ?? [])
}
