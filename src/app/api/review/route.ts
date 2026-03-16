export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { startOfISOWeek, endOfISOWeek, format, eachDayOfInterval } from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HabitLog {
  habit_id: string
  date: string
  completed: boolean
}

interface FocusRow {
  date: string
  task_1: string | null
  task_1_done: boolean
  task_2: string | null
  task_2_done: boolean
  task_3: string | null
  task_3_done: boolean
}

interface GoalRow {
  id: string
  target_value: number | null
  current_value: number
  completed: boolean
  updated_at: string
}

interface ClientRow {
  id: string
  status: string
  created_at: string
}

interface InteractionRow {
  id: string
  created_at: string
}

interface WeeklyReflection {
  id: string
  week_start: string
  wins: string | null
  lessons: string | null
  next_focus: string | null
  score: number | null
  created_at: string
  updated_at: string
}

// ─── Score Calculation ────────────────────────────────────────────────────────
// Weights:
//   Habit consistency   35 pts
//   Big 3 completion    30 pts
//   Goal progress       20 pts
//   Client activity     15 pts

function calcScore({
  habitRate,
  focusRate,
  goalRate,
  clientRate,
}: {
  habitRate: number
  focusRate: number
  goalRate: number
  clientRate: number
}): number {
  const score =
    habitRate * 35 +
    focusRate * 30 +
    goalRate * 20 +
    clientRate * 15
  return Math.round(Math.min(100, Math.max(0, score)))
}

function scoreLabel(score: number): string {
  if (score >= 90) return 'Elite 🔥'
  if (score >= 75) return 'Strong 💪'
  if (score >= 60) return 'Solid ✅'
  if (score >= 45) return 'Fair 📈'
  return 'Needs Work 🔄'
}

// ─── GET /api/review?week=YYYY-MM-DD ─────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const weekParam = searchParams.get('week') // any date in the target week
    const anchor = weekParam ? new Date(weekParam) : new Date()

    const weekStart = startOfISOWeek(anchor)
    const weekEnd   = endOfISOWeek(anchor)
    const weekDays  = eachDayOfInterval({ start: weekStart, end: weekEnd })
    const dateStrings = weekDays.map(d => format(d, 'yyyy-MM-dd'))
    const startStr  = format(weekStart, 'yyyy-MM-dd')
    const endStr    = format(weekEnd, 'yyyy-MM-dd')

    // ── 1. Habits ─────────────────────────────────────────────────────────────
    const { data: habits, error: habitsErr } = await supabaseAdmin
      .from('habits')
      .select('id, title, icon, active')
      .eq('active', true)
    if (habitsErr) throw habitsErr

    const { data: habitLogs, error: logsErr } = await supabaseAdmin
      .from('habit_logs')
      .select('habit_id, date, completed')
      .in('date', dateStrings)
      .eq('completed', true)
    if (logsErr) throw logsErr

    const activeHabits = habits ?? []
    const logs = (habitLogs ?? []) as HabitLog[]
    const totalPossibleHabitChecks = activeHabits.length * 7
    const completedHabitChecks = logs.length
    const habitRate = totalPossibleHabitChecks > 0
      ? completedHabitChecks / totalPossibleHabitChecks
      : 0

    // Per-habit breakdown (how many days completed)
    const habitBreakdown = activeHabits.map(h => ({
      id: h.id as string,
      title: h.title as string,
      icon: h.icon as string,
      days_completed: logs.filter(l => l.habit_id === h.id).length,
    }))

    // ── 2. Big 3 Focus ────────────────────────────────────────────────────────
    const { data: focusRows, error: focusErr } = await supabaseAdmin
      .from('focus_tasks')
      .select('date, task_1, task_1_done, task_2, task_2_done, task_3, task_3_done')
      .in('date', dateStrings)
    if (focusErr) throw focusErr

    const focus = (focusRows ?? []) as FocusRow[]
    let totalFocusTasks = 0
    let completedFocusTasks = 0
    const focusByDay = dateStrings.map(date => {
      const row = focus.find(f => f.date === date)
      if (!row) return { date, set: 0, done: 0 }
      const tasks = [
        { text: row.task_1, done: row.task_1_done },
        { text: row.task_2, done: row.task_2_done },
        { text: row.task_3, done: row.task_3_done },
      ].filter(t => t.text)
      const set  = tasks.length
      const done = tasks.filter(t => t.done).length
      totalFocusTasks    += set
      completedFocusTasks += done
      return { date, set, done }
    })
    const focusRate = totalFocusTasks > 0 ? completedFocusTasks / totalFocusTasks : 0

    // ── 3. Goals ──────────────────────────────────────────────────────────────
    const { data: goalsData, error: goalsErr } = await supabaseAdmin
      .from('goals')
      .select('id, target_value, current_value, completed, updated_at')
    if (goalsErr) throw goalsErr

    const goals = (goalsData ?? []) as GoalRow[]
    const totalGoals = goals.length
    const completedGoals = goals.filter(g => g.completed).length
    const onTrackGoals   = goals.filter(g => {
      if (g.completed) return true
      if (!g.target_value || g.target_value === 0) return false
      return g.current_value / g.target_value >= 0.5
    }).length
    const goalRate = totalGoals > 0 ? onTrackGoals / totalGoals : 0

    // ── 4. Client activity ────────────────────────────────────────────────────
    const { data: newLeads, error: leadsErr } = await supabaseAdmin
      .from('clients')
      .select('id, status, created_at')
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString())
    if (leadsErr) throw leadsErr

    const { data: interactions, error: intErr } = await supabaseAdmin
      .from('interactions')
      .select('id, created_at')
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', weekEnd.toISOString())
    if (intErr) throw intErr

    const leadsCount        = (newLeads as ClientRow[] ?? []).length
    const interactionsCount = (interactions as InteractionRow[] ?? []).length
    // clientRate: clamp at 1.0 for 10+ interactions or 3+ new leads
    const clientRate = Math.min(1.0, (interactionsCount / 10) * 0.7 + (leadsCount / 3) * 0.3)

    // ── 5. Score ──────────────────────────────────────────────────────────────
    const score = calcScore({ habitRate, focusRate, goalRate, clientRate })

    // ── 6. Existing reflection ────────────────────────────────────────────────
    const { data: reflectionData } = await supabaseAdmin
      .from('weekly_reflections')
      .select('*')
      .eq('week_start', startStr)
      .maybeSingle()

    const reflection = reflectionData as WeeklyReflection | null

    return NextResponse.json({
      week_start: startStr,
      week_end:   endStr,
      score,
      score_label: scoreLabel(score),
      habits: {
        total_active:    activeHabits.length,
        total_possible:  totalPossibleHabitChecks,
        completed:       completedHabitChecks,
        rate:            Math.round(habitRate * 100),
        breakdown:       habitBreakdown,
      },
      focus: {
        days_with_tasks: focusByDay.filter(d => d.set > 0).length,
        total_tasks:     totalFocusTasks,
        completed_tasks: completedFocusTasks,
        rate:            Math.round(focusRate * 100),
        by_day:          focusByDay,
      },
      goals: {
        total:     totalGoals,
        completed: completedGoals,
        on_track:  onTrackGoals,
        rate:      Math.round(goalRate * 100),
      },
      clients: {
        new_leads:    leadsCount,
        interactions: interactionsCount,
        rate:         Math.round(clientRate * 100),
      },
      reflection,
    })
  } catch (err) {
    console.error('[/api/review] GET error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
