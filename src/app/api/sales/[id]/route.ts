export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { formatSupabaseError, isMissingTableError } from '@/lib/supabase-error'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await withAuth(request)
  if (!auth.authorized) return auth.response!
  try {
    const { error } = await supabaseAdmin
      .from('sales')
      .delete()
      .eq('id', params.id)

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          { error: 'Sales table missing. Run Supabase migrations (supabase/migrations/20260301_sales.sql).' },
          { status: 503 }
        )
      }
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: formatSupabaseError(error) }, { status: 500 })
  }
}
