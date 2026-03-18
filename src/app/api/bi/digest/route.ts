export const dynamic = 'force-dynamic'
import { NextResponse , NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const auth = await withAuth(request)
  if (!auth.authorized) return auth.response!
  try {
    // Get the latest digest
    const { data: digest, error } = await supabaseAdmin
      .from('bi_digests')
      .select('*')
      .order('digest_date', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No digest found
        return NextResponse.json({ digest: null, recommendations: [], reports: [] })
      }
      throw error
    }

    // Get recommendations for this digest
    const { data: recommendations, error: recsError } = await supabaseAdmin
      .from('bi_recommendations')
      .select('*')
      .eq('digest_id', digest.id)
      .order('rank', { ascending: true })

    if (recsError) throw recsError

    // Get expert reports for this date
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
