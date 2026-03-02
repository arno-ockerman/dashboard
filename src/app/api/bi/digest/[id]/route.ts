export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const { data: digest, error } = await supabaseAdmin
      .from('bi_digests')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    const { data: recommendations, error: recsError } = await supabaseAdmin
      .from('bi_recommendations')
      .select('*')
      .eq('digest_id', id)
      .order('rank', { ascending: true })

    if (recsError) throw recsError

    const { data: reports, error: reportsError } = await supabaseAdmin
      .from('bi_reports')
      .select('*')
      .eq('report_date', digest.digest_date)
      .order('created_at', { ascending: true })

    if (reportsError) throw reportsError

    return NextResponse.json({ digest, recommendations: recommendations ?? [], reports: reports ?? [] })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
