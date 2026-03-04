import type { HabitWithHistory } from '@/types/habits'

interface HabitHeatmapProps {
  habit: HabitWithHistory
  dateRange: string[]
}

export default function HabitHeatmap({ habit, dateRange }: HabitHeatmapProps) {
  const paddedDates = [
    ...Array.from({ length: Math.max(35 - dateRange.length, 0) }, () => null),
    ...dateRange,
  ].slice(-35)

  return (
    <div className="mt-4 border-t border-zinc-800/80 pt-4">
      <div className="grid grid-cols-7 gap-1">
        {paddedDates.map((date, index) => {
          const completed = date ? habit.completions[date] : false
          const cellClass = !date
            ? 'bg-transparent border-transparent'
            : completed
            ? 'bg-brand-green/80 border-brand-green/50'
            : 'bg-zinc-800/60 border-zinc-700/30'

          return (
            <div
              key={date ?? `padding-${index}`}
              title={date ?? undefined}
              className={`h-2.5 w-2.5 rounded-sm border sm:h-3 sm:w-3 ${cellClass}`}
            />
          )
        })}
      </div>

      <div className="mt-3 text-xs text-zinc-400">
        🔥 {habit.streak} day streak · 🏆 {habit.longestStreak} best · {Math.round(habit.completionRate * 100)}% this month
      </div>
    </div>
  )
}
