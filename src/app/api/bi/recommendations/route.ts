export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const digest_id = searchParams.get('digest_id')
    const limit = parseInt(searchParams.get('limit') ?? '50')

    let query = supabaseAdmin
      .from('bi_recommendations')
      .select('*, bi_digests(digest_date, status)')
      .order('created_at', { ascending: false })
      .order('rank', { ascending: true })
      .limit(limit)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    if (digest_id) {
      query = query.eq('digest_id', digest_id)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json(data ?? [])
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
