export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { format, startOfWeek, endOfWeek, subDays, isToday, isBefore } from 'date-fns'

// GET /api/brief  — aggregated daily brief for today
export async function GET() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const now = new Date()

  try {
    // ── 1. Big 3 Focus ─────────────────────────────────────────────────────
    const { data: focusData } = await supabaseAdmin
      .from('daily_focus')
      .select('*')
      .eq('user_id', 'arno')
      .eq('date', today)
      .maybeSingle()

    const big3 = focusData
      ? [
          { text: focusData.task_1 ?? null, done: focusData.task_1_done ?? false },
          { text: focusData.task_2 ?? null, done: focusData.task_2_done ?? false },
          { text: focusData.task_3 ?? null, done: focusData.task_3_done ?? false },
        ].filter((t) => t.text !== null)
      : []

    // ── 2. Habits ─────────────────────────────────────────────────────────
    const { data: habitsRaw } = await supabaseAdmin
      .from('habits')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: true })

    const { data: logsToday } = await supabaseAdmin
      .from('habit_logs')
      .select('*')
      .eq('date', today)

    const habits = (habitsRaw ?? []).map((h) => ({
      id: h.id,
      name: h.name,
      icon: h.icon ?? null,
      target: h.target ?? null,
      unit: h.unit ?? null,
      completed: logsToday?.some((l) => l.habit_id === h.id && l.completed) ?? false,
    }))

    // ── 3. Clients needing attention ──────────────────────────────────────
    const { data: allClients } = await supabaseAdmin
      .from('clients')
      .select('id, name, status, next_follow_up, next_action, last_contact, tags')
      .in('status', ['lead', 'prospect', 'active', 'vip'])
      .not('next_follow_up', 'is', null)
      .order('next_follow_up', { ascending: true })
      .limit(20)

    const clientsAttention = (allClients ?? [])
      .filter((c) => {
        if (!c.next_follow_up) return false
        const followUpDate = new Date(c.next_follow_up)
        return isBefore(followUpDate, now) || isToday(followUpDate)
      })
      .slice(0, 5)

    // ── 4. Content scheduled today ────────────────────────────────────────
    const { data: contentToday } = await supabaseAdmin
      .from('content_posts')
      .select('id, title, platform, post_type, status, scheduled_date')
      .eq('scheduled_date', today)
      .order('created_at', { ascending: true })

    // ── 5. Weekly accountability score ────────────────────────────────────
    const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const weekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')

    // Habit completions this week
    const { data: weekLogs } = await supabaseAdmin
      .from('habit_logs')
      .select('habit_id, date, completed')
      .gte('date', weekStart)
      .lte('date', weekEnd)

    const totalHabitSlots = (habitsRaw?.length ?? 0) * 7
    const completedHabitLogs = weekLogs?.filter((l) => l.completed).length ?? 0
    const habitRate = totalHabitSlots > 0 ? Math.round((completedHabitLogs / totalHabitSlots) * 100) : 0

    // Big 3 completions this week
    const { data: weekFocus } = await supabaseAdmin
      .from('daily_focus')
      .select('*')
      .eq('user_id', 'arno')
      .gte('date', weekStart)
      .lte('date', weekEnd)

    let focusDaysSet = 0
    for (const day of weekFocus ?? []) {
      if (day.task_1 || day.task_2 || day.task_3) focusDaysSet++
    }
    const focusRate = Math.round((focusDaysSet / 7) * 100)

    // Composite score (simple: habits 50% + focus 50%)
    const weekScore = Math.round(habitRate * 0.5 + focusRate * 0.5)

    // ── 6. Habit streak ───────────────────────────────────────────────────
    let habitStreak = 0
    for (let i = 0; i < 30; i++) {
      const d = format(subDays(now, i), 'yyyy-MM-dd')
      const { data: dayLogs } = await supabaseAdmin
        .from('habit_logs')
        .select('completed')
        .eq('date', d)
        .eq('completed', true)
        .limit(1)
      if (dayLogs && dayLogs.length > 0) {
        habitStreak++
      } else {
        break
      }
    }

    // ── 7. Motivational context ───────────────────────────────────────────
    const hour = now.getUTCHours() + 1 // Brussels is UTC+1 (CET)
    let greeting = 'Goedemiddag'
    if (hour >= 5 && hour < 12) greeting = 'Goedemorgen'
    else if (hour >= 12 && hour < 18) greeting = 'Goedemiddag'
    else greeting = 'Goedenavond'

    const big3Done = big3.filter((t) => t.done).length
    const habitsCompleted = habits.filter((h) => h.completed).length

    return NextResponse.json({
      today,
      greeting,
      big3: {
        tasks: big3,
        done: big3Done,
        total: big3.length,
        set: big3.length > 0,
      },
      habits: {
        items: habits,
        done: habitsCompleted,
        total: habits.length,
        streak: habitStreak,
      },
      clients_attention: clientsAttention,
      content_today: contentToday ?? [],
      week: {
        score: weekScore,
        habit_rate: habitRate,
        focus_rate: focusRate,
        start: weekStart,
        end: weekEnd,
      },
    })
  } catch (err) {
    console.error('Brief API error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
