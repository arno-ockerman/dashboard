export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { dailyFocusSchema } from '@/lib/validators'
import { format, subDays } from 'date-fns'

// GET /api/focus?date=YYYY-MM-DD  — fetch today's or specific day's focus
// GET /api/focus?history=7        — fetch last N days for history/streak
export async function GET(req: NextRequest) {
  const auth = await withAuth(req)
  if (!auth.authorized) return auth.response!
  const { searchParams } = new URL(req.url)
  const dateParam = searchParams.get('date')
  const history = searchParams.get('history')

  if (history) {
    const days = parseInt(history, 10) || 7
    const dates = Array.from({ length: days }, (_, i) =>
      format(subDays(new Date(), i), 'yyyy-MM-dd')
    )

    const { data, error } = await supabaseAdmin
      .from('daily_focus')
      .select('*')
      .eq('user_id', 'arno')
      .in('date', dates)
      .order('date', { ascending: false })

    if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

    // Calculate streak: count consecutive days from today that have at least 1 task
    const dataMap = new Map((data || []).map((d) => [d.date, d]))
    let streak = 0
    for (let i = 0; i < 365; i++) {
      const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
      const row = dataMap.get(d)
      if (row && (row.task_1 || row.task_2 || row.task_3)) {
        streak++
      } else {
        break
      }
    }

    return NextResponse.json({ history: data || [], streak })
  }

  const date = dateParam || format(new Date(), 'yyyy-MM-dd')

  const { data, error } = await supabaseAdmin
    .from('daily_focus')
    .select('*')
    .eq('user_id', 'arno')
    .eq('date', date)
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 })

  return NextResponse.json({ focus: data })
}

// POST /api/focus — upsert today's focus data
export async function POST(req: NextRequest) {
  const auth = await withAuth(req)
  if (!auth.authorized) return auth.response!

  try {
    const json = await req.json()
    const parsed = dailyFocusSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const {
      date,
      task_1, task_1_done,
      task_2, task_2_done,
      task_3, task_3_done,
      reflection,
      energy_level,
      focus_score,
      pomodoros_completed,
    } = parsed.data

    const focusDate = date || format(new Date(), 'yyyy-MM-dd')

    const { data, error } = await supabaseAdmin
      .from('daily_focus')
      .upsert(
        {
          user_id: 'arno',
          date: focusDate,
          task_1: task_1 ?? null,
          task_1_done: task_1_done ?? false,
          task_2: task_2 ?? null,
          task_2_done: task_2_done ?? false,
          task_3: task_3 ?? null,
          task_3_done: task_3_done ?? false,
          reflection: reflection ?? null,
          energy_level: energy_level ?? null,
          focus_score: focus_score ?? null,
          pomodoros_completed: pomodoros_completed ?? 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,date' }
      )
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ focus: data })
  } catch (err) {
    console.error('[focus POST]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
