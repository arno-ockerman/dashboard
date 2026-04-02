import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { saleSchema } from '@/lib/validators'
import { formatSupabaseError, isMissingTableError } from '@/lib/supabase-error'
import { addMonths, format, parse } from 'date-fns'

function buildMonthRange(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) return null
  const parsed = parse(`${month}-01`, 'yyyy-MM-dd', new Date())
  if (Number.isNaN(parsed.getTime())) return null
  return { start: format(parsed, 'yyyy-MM-dd'), end: format(addMonths(parsed, 1), 'yyyy-MM-dd') }
}

export async function GET(request: NextRequest) {
  const auth = await withAuth(request)
  if (!auth.authorized) return auth.response!
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 1000)

    let query = supabaseAdmin
      .from('sales')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (month) {
      const range = buildMonthRange(month)
      if (!range) return NextResponse.json({ error: 'Invalid month' }, { status: 400 })
      query = query.gte('date', range.start).lt('date', range.end)
    }

    const { data, error } = await query
    if (error) {
      if (isMissingTableError(error)) return NextResponse.json([])
      throw error
    }
    return NextResponse.json(data || [])
  } catch (error) {
    return NextResponse.json({ error: formatSupabaseError(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await withAuth(request)
  if (!auth.authorized) return auth.response!
  try {
    const json = await request.json()
    const parsed = saleSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const payload = {
      ...parsed.data,
      date: parsed.data.date || format(new Date(), 'yyyy-MM-dd'),
    }

    const { data, error } = await supabaseAdmin
      .from('sales')
      .insert(payload)
      .select()
      .single()

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json({ error: 'Sales table missing' }, { status: 503 })
      }
      throw error
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: formatSupabaseError(error) }, { status: 500 })
  }
}
