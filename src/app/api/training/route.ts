import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { trainingLogSchema } from '@/lib/validators'
import { format, subDays } from 'date-fns'

// GET /api/training?days=30 — fetch training logs
export async function GET(req: NextRequest) {
  const auth = await withAuth(req)
  if (!auth.authorized) return auth.response!

  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get('days') || '30', 10)
  const since = format(subDays(new Date(), days), 'yyyy-MM-dd')

  const { data, error } = await supabaseAdmin
    .from('training_logs')
    .select('*')
    .gte('date', since)
    .order('date', { ascending: false })

  if (error) {
    console.error('training GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // Compute weekly stats
  const now = new Date()
  const weekStart = format(subDays(now, now.getDay() === 0 ? 6 : now.getDay() - 1), 'yyyy-MM-dd')
  const thisWeek = (data || []).filter((l) => l.date >= weekStart)
  const weekStats = {
    workouts: thisWeek.length,
    totalMinutes: thisWeek.reduce((s, l) => s + (l.duration_min || 0), 0),
    avgEnergy: thisWeek.length
      ? +(thisWeek.reduce((s, l) => s + (l.energy_level || 0), 0) / thisWeek.length).toFixed(1)
      : null,
  }

  return NextResponse.json({ logs: data || [], weekStats })
}

// POST /api/training — create a training log
export async function POST(req: NextRequest) {
  const auth = await withAuth(req)
  if (!auth.authorized) return auth.response!

  try {
    const json = await req.json()
    const parsed = trainingLogSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('training_logs')
      .insert({
        ...parsed.data,
        date: parsed.data.date || format(new Date(), 'yyyy-MM-dd'),
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ log: data }, { status: 201 })
  } catch (err) {
    console.error('training POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
