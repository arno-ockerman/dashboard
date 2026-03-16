export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { HabitHistoryResponse, HabitWithHistory } from '@/types/habits'

interface HabitRow {
  id: string
  title: string
  icon: string
  streak: number
  active: boolean
  created_at: string
}

interface HabitLogRow {
  habit_id: string
  date: string
  completed: boolean
}

function clampDays(value: string | null) {
  const parsed = Number.parseInt(value ?? '30', 10)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 30
  }

  return Math.min(parsed, 90)
}

function toUtcDateString(date: Date) {
  return date.toISOString().split('T')[0]
}

function buildDateRange(days: number) {
  const endDate = new Date(`${toUtcDateString(new Date())}T00:00:00.000Z`)
  const range: string[] = []

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const current = new Date(endDate)
    current.setUTCDate(endDate.getUTCDate() - offset)
    range.push(toUtcDateString(current))
  }

  return range
}

function calculateCurrentStreak(dateRange: string[], completions: Record<string, boolean>) {
  let streak = 0

  for (let index = dateRange.length - 1; index >= 0; index -= 1) {
    if (!completions[dateRange[index]]) {
      break
    }

    streak += 1
  }

  return streak
}

function calculateLongestStreak(dateRange: string[], completions: Record<string, boolean>) {
  let longest = 0
  let running = 0

  for (const date of dateRange) {
    if (completions[date]) {
      running += 1
      longest = Math.max(longest, running)
      continue
    }

    running = 0
  }

  return longest
}

export async function GET(request: NextRequest) {
  try {
    const days = clampDays(request.nextUrl.searchParams.get('days'))
    const dateRange = buildDateRange(days)

    const { data: habitsData, error: habitsError } = await supabaseAdmin
      .from('habits')
      .select('id, title, icon, streak, active, created_at')
      .eq('active', true)
      .order('created_at', { ascending: true })

    if (habitsError) {
      throw habitsError
    }

    const habits = (habitsData ?? []) as HabitRow[]

    if (habits.length === 0) {
      const emptyResponse: HabitHistoryResponse = {
        habits: [],
        dateRange,
      }

      return NextResponse.json(emptyResponse)
    }

    const habitIds = habits.map((habit) => habit.id)

    const { data: logsData, error: logsError } = await supabaseAdmin
      .from('habit_logs')
      .select('habit_id, date, completed')
      .in('habit_id', habitIds)
      .gte('date', dateRange[0])
      .lte('date', dateRange[dateRange.length - 1])

    if (logsError) {
      throw logsError
    }

    const logs = (logsData ?? []) as HabitLogRow[]
    const logsByHabit = new Map<string, Map<string, boolean>>()

    for (const log of logs) {
      if (!logsByHabit.has(log.habit_id)) {
        logsByHabit.set(log.habit_id, new Map<string, boolean>())
      }

      logsByHabit.get(log.habit_id)?.set(log.date, log.completed)
    }

    const responseHabits: HabitWithHistory[] = habits.map((habit) => {
      const habitLogMap = logsByHabit.get(habit.id) ?? new Map<string, boolean>()
      const completions = dateRange.reduce<Record<string, boolean>>((accumulator, date) => {
        accumulator[date] = habitLogMap.get(date) ?? false
        return accumulator
      }, {})

      const completedDays = Object.values(completions).filter(Boolean).length
      const streak = calculateCurrentStreak(dateRange, completions)
      const longestStreak = calculateLongestStreak(dateRange, completions)

      return {
        ...habit,
        streak,
        longestStreak,
        completionRate: completedDays / dateRange.length,
        completions,
      }
    })

    const response: HabitHistoryResponse = {
      habits: responseHabits,
      dateRange,
    }

    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
