export const dynamic = 'force-dynamic'
import { NextResponse , NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const auth = await withAuth(request)
  if (!auth.authorized) return auth.response!
  try {
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabaseAdmin
      .from('clients')
      .select('*')
      .lte('next_follow_up', today)
      .neq('status', 'inactive')
      .order('next_follow_up', { ascending: true })

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
