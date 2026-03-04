import type { Habit } from '@/types'

export interface HabitWithHistory extends Habit {
  longestStreak: number
  completionRate: number
  completions: Record<string, boolean>
}

export interface HabitHistoryResponse {
  habits: HabitWithHistory[]
  dateRange: string[]
}
