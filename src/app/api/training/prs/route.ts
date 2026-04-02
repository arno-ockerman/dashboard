export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase-admin'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Exercise {
  name: string
  sets: number
  reps: number
  weight_kg: number | null
}

interface TrainingLog {
  id: string
  date: string
  workout_type: string
  exercises: Exercise[]
}

export interface PersonalRecord {
  exercise: string
  best_weight_kg: number
  best_reps: number
  best_sets: number
  best_volume: number      // weight × sets × reps
  achieved_date: string
  workout_type: string
  total_sessions: number  // how many times this exercise appears
  recent_weight_kg: number | null  // last time performed weight
  trend: 'up' | 'down' | 'equal' | 'new'
}

export interface PRsResponse {
  records: PersonalRecord[]
  total_exercises: number
  total_logs_scanned: number
}

// ─── GET /api/training/prs ────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await withAuth(req)
  if (!auth.authorized) return auth.response!

  // Fetch ALL training logs (no date limit — we want all-time records)
  const { data, error } = await supabaseAdmin
    .from('training_logs')
    .select('id, date, workout_type, exercises')
    .order('date', { ascending: true })

  if (error) {
    console.error('training/prs GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  const logs: TrainingLog[] = (data || []).map((row) => ({
    id: row.id,
    date: row.date,
    workout_type: row.workout_type,
    exercises: Array.isArray(row.exercises) ? row.exercises : [],
  }))

  // ─── Aggregate per exercise name (case-insensitive, trimmed) ──────────────

  interface ExerciseAgg {
    exercise: string
    best_weight_kg: number
    best_reps: number
    best_sets: number
    best_volume: number
    achieved_date: string
    workout_type: string
    total_sessions: number
    weight_history: { date: string; weight_kg: number }[]
  }

  const agg = new Map<string, ExerciseAgg>()

  for (const log of logs) {
    for (const ex of log.exercises) {
      if (!ex.name) continue
      const key = ex.name.trim().toLowerCase()
      const displayName = ex.name.trim()
      const weight = ex.weight_kg ?? 0
      const volume = weight * (ex.sets || 1) * (ex.reps || 1)

      if (!agg.has(key)) {
        agg.set(key, {
          exercise: displayName,
          best_weight_kg: weight,
          best_reps: ex.reps,
          best_sets: ex.sets,
          best_volume: volume,
          achieved_date: log.date,
          workout_type: log.workout_type,
          total_sessions: 1,
          weight_history: weight > 0 ? [{ date: log.date, weight_kg: weight }] : [],
        })
      } else {
        const prev = agg.get(key)!
        prev.total_sessions += 1

        if (weight > 0) {
          prev.weight_history.push({ date: log.date, weight_kg: weight })
        }

        if (weight > prev.best_weight_kg || (weight === prev.best_weight_kg && volume > prev.best_volume)) {
          prev.best_weight_kg = weight
          prev.best_reps = ex.reps
          prev.best_sets = ex.sets
          prev.best_volume = volume
          prev.achieved_date = log.date
          prev.workout_type = log.workout_type
        }
      }
    }
  }

  // ─── Build response with trends ───────────────────────────────────────────

  const records: PersonalRecord[] = Array.from(agg.values())
    .filter((a) => a.best_weight_kg > 0)  // skip bodyweight / no-weight exercises
    .map((a) => {
      const history = a.weight_history
      const recent = history.length > 0 ? history[history.length - 1].weight_kg : null
      const secondLast = history.length > 1 ? history[history.length - 2].weight_kg : null

      let trend: PersonalRecord['trend'] = 'new'
      if (history.length >= 2 && secondLast !== null && recent !== null) {
        if (recent > secondLast) trend = 'up'
        else if (recent < secondLast) trend = 'down'
        else trend = 'equal'
      }

      return {
        exercise: a.exercise,
        best_weight_kg: a.best_weight_kg,
        best_reps: a.best_reps,
        best_sets: a.best_sets,
        best_volume: Math.round(a.best_volume),
        achieved_date: a.achieved_date,
        workout_type: a.workout_type,
        total_sessions: a.total_sessions,
        recent_weight_kg: recent,
        trend,
      }
    })
    .sort((a, b) => b.best_volume - a.best_volume) // sort by volume desc

  return NextResponse.json({
    records,
    total_exercises: records.length,
    total_logs_scanned: logs.length,
  } satisfies PRsResponse)
}
