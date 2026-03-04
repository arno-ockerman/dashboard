export const dynamic = 'force-dynamic'

import { addMonths, format, parse } from 'date-fns'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { formatSupabaseError, isMissingTableError } from '@/lib/supabase-error'
import type { ProductCategory } from '@/types'

const CATEGORY_VALUES: ProductCategory[] = [
  'shakes',
  'supplements',
  'tea',
  'aloe',
  'skin',
  'challenge',
  'other',
]

function buildMonthRange(month: string) {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return null
  }

  const parsed = parse(`${month}-01`, 'yyyy-MM-dd', new Date())
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  const start = format(parsed, 'yyyy-MM-dd')
  const end = format(addMonths(parsed, 1), 'yyyy-MM-dd')

  return { start, end }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')
    const limitValue = Number.parseInt(searchParams.get('limit') || '50', 10)
    const limit = Number.isFinite(limitValue) ? Math.min(Math.max(limitValue, 1), 1000) : 50

    let query = supabaseAdmin
      .from('sales')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit)

    if (month) {
      const range = buildMonthRange(month)
      if (!range) {
        return NextResponse.json({ error: 'Invalid month. Use YYYY-MM.' }, { status: 400 })
      }

      query = query
        .gte('date', range.start)
        .lt('date', range.end)
    }

    const { data, error } = await query

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json([])
      }
      throw error
    }

    return NextResponse.json(data || [])
  } catch (error) {
    return NextResponse.json({ error: formatSupabaseError(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const amount = Number.parseFloat(String(body.amount))
    const productCategory = CATEGORY_VALUES.includes(body.product_category) ? body.product_category : 'other'

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0.' }, { status: 400 })
    }

    const payload = {
      client_id: body.client_id || null,
      client_name: typeof body.client_name === 'string' ? body.client_name.trim() || null : null,
      product_category: productCategory,
      product_name: typeof body.product_name === 'string' ? body.product_name.trim() || null : null,
      amount,
      date: typeof body.date === 'string' && body.date ? body.date : format(new Date(), 'yyyy-MM-dd'),
      notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
    }

    const { data, error } = await supabaseAdmin
      .from('sales')
      .insert(payload)
      .select()
      .single()

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          { error: 'Sales table missing. Run Supabase migrations (supabase/migrations/20260301_sales.sql).' },
          { status: 503 }
        )
      }
      throw error
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: formatSupabaseError(error) }, { status: 500 })
  }
}
