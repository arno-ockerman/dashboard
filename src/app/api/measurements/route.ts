import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Measurement, MeasurementsListResponse } from '@/types'

// GET /api/measurements
// Query params:
//   clientName=string  — filter by client name (exact)
//   limit=20           — max rows (default 20, max 100)
//   offset=0           — pagination offset
export async function GET(req: NextRequest) {
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
// Body: Partial<Measurement> (client_name + date required)
export async function POST(req: NextRequest) {
  let body: Partial<Measurement>

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.client_name?.trim()) {
    return NextResponse.json({ error: 'client_name is required' }, { status: 400 })
  }
  if (!body.date) {
    return NextResponse.json({ error: 'date is required' }, { status: 400 })
  }

  const insert = {
    client_name:  body.client_name.trim(),
    client_id:    body.client_id  ?? null,
    date:         body.date,
    weight_kg:    body.weight_kg    ?? null,
    body_fat_pct: body.body_fat_pct ?? null,
    waist_cm:     body.waist_cm     ?? null,
    hip_cm:       body.hip_cm       ?? null,
    chest_cm:     body.chest_cm     ?? null,
    notes:        body.notes?.trim() || null,
  }

  const { data, error } = await supabaseAdmin
    .from('measurements')
    .insert(insert)
    .select()
    .single()

  if (error) {
    console.error('[measurements POST]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ measurement: data as Measurement }, { status: 201 })
}
