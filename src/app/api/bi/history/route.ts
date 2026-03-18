export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const auth = await withAuth(request)
  if (!auth.authorized) return auth.response!
  try {
    const { data, error } = await supabaseAdmin
      .from('bi_digests')
      .select('*')
      .order('digest_date', { ascending: false })
      .limit(30)

    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
