export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') ?? '30', 10)

    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceStr = since.toISOString().split('T')[0]

    // Try health_metrics first (primary table from Apple Health import),
    // fall back to health_snapshots (legacy/manual entries)
    let data: any[] | null = null
    let error: any = null

    const metricsRes = await supabaseAdmin
      .from('health_metrics')
      .select('*')
      .gte('date', sinceStr)
      .order('date', { ascending: false })

    if (!metricsRes.error && metricsRes.data && metricsRes.data.length > 0) {
      // Map health_metrics columns to health_snapshots format for frontend compatibility
      data = metricsRes.data.map((r: any) => ({
        ...r,
        lean_mass_kg: r.lean_body_mass_kg,
        active_calories: r.active_kcal ? Math.round(r.active_kcal) : null,
        exercise_min: r.exercise_minutes,
        sleep_hours: r.sleep_total_hours,
        sleep_awakenings: r.sleep_awake_count,
        steps: r.steps,
      }))
    } else {
      // Fallback to health_snapshots
      const snapshotsRes = await supabaseAdmin
        .from('health_snapshots')
        .select('*')
        .gte('date', sinceStr)
        .order('date', { ascending: false })
      data = snapshotsRes.data
      error = snapshotsRes.error
    }

    if (error) throw error

    // Compute trends from latest two records
    const latest = data?.[0] ?? null
    const previous = data?.[1] ?? null

    const trend = (field: keyof typeof latest, higherIsBetter = true) => {
      if (!latest || !previous) return 'neutral'
      const curr = latest[field] as number | null
      const prev = previous[field] as number | null
      if (curr == null || prev == null) return 'neutral'
      const diff = curr - prev
      if (Math.abs(diff) < 0.1) return 'neutral'
      return (diff > 0) === higherIsBetter ? 'up' : 'down'
    }

    // Averages over the window
    const avg = (field: keyof typeof latest) => {
      const vals = (data ?? [])
        .map((r) => r[field] as number | null)
        .filter((v): v is number => v != null)
      if (!vals.length) return null
      return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
    }

    return NextResponse.json({
      snapshots: data ?? [],
      latest,
      trends: {
        weight:    trend('weight_kg',       false), // lower = better
        body_fat:  trend('body_fat_pct',    false),
        lean_mass: trend('lean_mass_kg',    true),
        hrv:       trend('hrv_ms',          true),
        readiness: trend('readiness_score', true),
        steps:     trend('steps',           true),
      },
      averages: {
        weight:    avg('weight_kg'),
        body_fat:  avg('body_fat_pct'),
        lean_mass: avg('lean_mass_kg'),
        hrv:       avg('hrv_ms'),
        readiness: avg('readiness_score'),
        steps:     avg('steps'),
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// POST — upsert a health snapshot (called by iOS Shortcut via webhook proxy)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.date) {
      return NextResponse.json({ error: 'date is required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('health_snapshots')
      .upsert(body, { onConflict: 'date' })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
