import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { measurementSchema } from '@/lib/validators'
import type { Measurement, MeasurementsListResponse } from '@/types'

// GET /api/measurements
export async function GET(req: NextRequest) {
  const auth = await withAuth(req)
  if (!auth.authorized) return auth.response!

  const { searchParams } = req.nextUrl
  const clientName = searchParams.get('clientName') ?? ''
  const limit      = Math.min(parseInt(searchParams.get('limit')  ?? '20', 10), 100)
  const offset     = Math.max(parseInt(searchParams.get('offset') ?? '0',  10), 0)

  // Build query
  let query = supabaseAdmin
    .from('measurements')
    .select('*', { count: 'exact' })
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (clientName) {
    query = query.eq('client_name', clientName)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('[measurements GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // Distinct client names for the selector (most recent first)
  const { data: clientRows } = await supabaseAdmin
    .from('measurements')
    .select('client_name')
    .order('created_at', { ascending: false })

  const clients = Array.from(
    new Set((clientRows ?? []).map((r: { client_name: string }) => r.client_name))
  )

  const response: MeasurementsListResponse = {
    measurements: (data ?? []) as Measurement[],
    total: count ?? 0,
    clients,
  }

  return NextResponse.json(response)
}

// POST /api/measurements
export async function POST(req: NextRequest) {
  const auth = await withAuth(req)
  if (!auth.authorized) return auth.response!

  try {
    const json = await req.json()
    const parsed = measurementSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('measurements')
      .insert(parsed.data)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ measurement: data as Measurement }, { status: 201 })
  } catch (err) {
    console.error('[measurements POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
