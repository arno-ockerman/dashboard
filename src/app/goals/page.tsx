'use client'

import { useEffect, useState } from 'react'
import {
  Target, Plus, X, CheckCircle2, Flame, Edit2, Trash2, Check, BarChart2,
} from 'lucide-react'
import HabitHeatmap from '@/components/HabitHeatmap'
import type { Goal, Habit, GoalCategory } from '@/types'
import type { HabitHistoryResponse } from '@/types/habits'

const GOAL_CATEGORY_COLORS: Record<GoalCategory, { bg: string; text: string; border: string }> = {
  business: { bg: 'bg-brand-burgundy/20', text: 'text-red-300', border: 'border-brand-burgundy/30' },
  fitness: { bg: 'bg-brand-green/20', text: 'text-green-300', border: 'border-brand-green/30' },
  personal: { bg: 'bg-brand-amber/20', text: 'text-amber-300', border: 'border-brand-amber/30' },
}

interface GoalForm {
  title: string
  category: GoalCategory
  target_value: string
  current_value: string
  unit: string
  deadline: string
}

interface HabitForm {
  title: string
  icon: string
}

const defaultGoalForm: GoalForm = {
  title: '', category: 'business',
  target_value: '', current_value: '0',
  unit: '', deadline: '',
}

const defaultHabitForm: HabitForm = {
  title: '', icon: '✅',
}

const HABIT_ICONS = ['✅', '💪', '🏃', '📚', '🥗', '💧', '🧘', '😴', '📱', '🎯', '💰', '🌿']

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [habits, setHabits] = useState<Habit[]>([])
  const [loading, setLoading] = useState(true)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [showHabitModal, setShowHabitModal] = useState(false)
  const [goalForm, setGoalForm] = useState<GoalForm>(defaultGoalForm)
  const [habitForm, setHabitForm] = useState<HabitForm>(defaultHabitForm)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [saving, setSaving] = useState(false)
  const [togglingHabit, setTogglingHabit] = useState<string | null>(null)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [historyData, setHistoryData] = useState<HabitHistoryResponse | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [goalsRes, habitsRes] = await Promise.all([
        fetch('/api/goals'),
        fetch('/api/habits'),
      ])
      setGoals(await goalsRes.json())
      setHabits(await habitsRes.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const fetchHistoryData = async () => {
    setHistoryLoading(true)
    try {
      const response = await fetch('/api/habits/history')
      const data = await response.json()
      setHistoryData(data)
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    if (!showAnalytics || historyData) {
      return
    }

    fetchHistoryData()
  }, [showAnalytics, historyData])

  const saveGoal = async () => {
    if (!goalForm.title) return
    setSaving(true)
    try {
      const payload = {
        ...goalForm,
        target_value: goalForm.target_value ? parseFloat(goalForm.target_value) : null,
        current_value: parseFloat(goalForm.current_value) || 0,
        deadline: goalForm.deadline || null,
      }

      if (editingGoal) {
        await fetch(`/api/goals/${editingGoal.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      setShowGoalModal(false)
      setGoalForm(defaultGoalForm)
      setEditingGoal(null)
      fetchData()
    } finally {
      setSaving(false)
    }
  }

  const deleteGoal = async (id: string) => {
    if (!confirm('Delete this goal?')) return
    await fetch(`/api/goals/${id}`, { method: 'DELETE' })
    fetchData()
  }

  const toggleGoalComplete = async (goal: Goal) => {
    await fetch(`/api/goals/${goal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...goal, completed: !goal.completed }),
    })
    fetchData()
  }

  const openEditGoal = (goal: Goal) => {
    setEditingGoal(goal)
    setGoalForm({
      title: goal.title,
      category: goal.category,
      target_value: goal.target_value?.toString() || '',
      current_value: goal.current_value.toString(),
      unit: goal.unit || '',
      deadline: goal.deadline || '',
    })
    setShowGoalModal(true)
  }

  const saveHabit = async () => {
    if (!habitForm.title) return
    setSaving(true)
    try {
      await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(habitForm),
      })
      setShowHabitModal(false)
      setHabitForm(defaultHabitForm)
      await fetchData()
      if (showAnalytics) {
        await fetchHistoryData()
      }
    } finally {
      setSaving(false)
    }
  }

  const toggleHabit = async (habitId: string, completed: boolean) => {
    setTogglingHabit(habitId)
    try {
      await fetch(`/api/habits/${habitId}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed }),
      })
      await fetchData()
      if (showAnalytics) {
        await fetchHistoryData()
      }
    } finally {
      setTogglingHabit(null)
    }
  }

  const activeGoals = goals.filter((g) => !g.completed)
  const completedGoals = goals.filter((g) => g.completed)
  const completedHabitsCount = habits.filter((h) => h.completed_today).length
  const habitHistoryById = new Map((historyData?.habits ?? []).map((habit) => [habit.id, habit]))

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl text-white tracking-widest uppercase"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            Goals & Habits
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            {completedHabitsCount}/{habits.length} habits done today
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowHabitModal(true)} className="btn-secondary">
            <Plus className="w-4 h-4" /> Habit
          </button>
          <button onClick={() => { setEditingGoal(null); setGoalForm(defaultGoalForm); setShowGoalModal(true) }} className="btn-primary">
            <Plus className="w-4 h-4" /> Goal
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="card skeleton h-24" />)}
        </div>
      ) : (
        <>
          {/* Habits section */}
          <div className="mb-8">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-400" />
                Daily Habits
                <span className="text-sm font-normal text-zinc-500">
                  {completedHabitsCount}/{habits.length} done
                </span>
              </h2>
              <button
                onClick={() => setShowAnalytics((current) => !current)}
                className="btn-secondary"
              >
                <BarChart2 className="w-4 h-4" />
                {showAnalytics ? 'Simple' : 'Analytics'}
              </button>
            </div>

            {habits.length === 0 ? (
              <div className="card text-center py-12">
                <p className="text-zinc-500 mb-4">No habits yet — build your daily routine</p>
                <button onClick={() => setShowHabitModal(true)} className="btn-primary mx-auto">
                  <Plus className="w-4 h-4" /> Add First Habit
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {habits.map((habit) => (
                  <div
                    key={habit.id}
                    className={`card text-left hover:border-zinc-600 transition-all duration-200 ${
                      habit.completed_today ? 'opacity-70 border-brand-green/20' : ''
                    } active:scale-[0.99] touch-manipulation`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                        habit.completed_today ? 'bg-brand-green/20' : 'bg-zinc-800'
                      }`}>
                        {habit.completed_today ? (
                          <CheckCircle2 className="w-6 h-6 text-brand-green" />
                        ) : (
                          habit.icon
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium ${
                          habit.completed_today ? 'text-zinc-400 line-through' : 'text-white'
                    <button
                      onClick={() => toggleHabit(habit.id, habit.completed_today ?? false)}
                      disabled={togglingHabit === habit.id}
                      className="w-full text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${
                          habit.completed_today ? 'bg-brand-green/20' : 'bg-zinc-800'
                        }`}>
                          {habit.completed_today ? (
                            <CheckCircle2 className="w-5 h-5 text-brand-green" />
                          ) : (
                            habit.icon
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium ${
                            habit.completed_today ? 'text-zinc-400 line-through' : 'text-white'
                          }`}>
                            {habit.title}
                          </p>
                          {habit.streak > 0 && (
                            <p className="text-xs text-orange-400 mt-0.5">
                              🔥 {habit.streak} day streak
                            </p>
                          )}
                        </div>
                      </div>
                    </button>

                    {showAnalytics && (
                      historyLoading && !historyData ? (
                        <div className="mt-4 border-t border-zinc-800/80 pt-4 space-y-2">
                          {[0, 1, 2].map((row) => (
                            <div
                              key={row}
                              className="h-3 rounded bg-zinc-800/70 animate-pulse"
                            />
                          ))}
                        </div>
                      ) : historyData ? (
                        <HabitHeatmap
                          habit={habitHistoryById.get(habit.id) ?? {
                            ...habit,
                            longestStreak: 0,
                            completionRate: 0,
                            completions: Object.fromEntries(
                              historyData.dateRange.map((date) => [date, false])
                            ),
                          }}
                          dateRange={historyData.dateRange}
                        />
                      ) : null
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Goals */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-brand-burgundy" />
              Active Goals
              <span className="text-sm font-normal text-zinc-500">{activeGoals.length} goals</span>
            </h2>

            {activeGoals.length === 0 ? (
              <div className="card text-center py-12">
                <p className="text-zinc-500 mb-4">No active goals — what do you want to achieve?</p>
                <button onClick={() => setShowGoalModal(true)} className="btn-primary mx-auto">
                  <Plus className="w-4 h-4" /> Set First Goal
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                      {activeGoals.map((goal) => {
                  const progress = goal.target_value && goal.target_value > 0
                    ? Math.min((goal.current_value / goal.target_value) * 100, 100)
                    : 0
                  const cc = GOAL_CATEGORY_COLORS[goal.category]

                  return (
                    <div key={goal.id} className={`card border ${cc.border}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <span className={`badge ${cc.bg} ${cc.text} mb-2`}>
                            {goal.category}
                          </span>
                          <h3 className="font-semibold text-white">{goal.title}</h3>
                          {goal.deadline && (
                            <p className="text-xs text-zinc-500 mt-0.5">
                              Deadline: {new Date(goal.deadline).toLocaleDateString('en-BE', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditGoal(goal)}
                            className="w-11 h-11 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 transition-colors touch-manipulation"
                            aria-label="Edit goal"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleGoalComplete(goal)}
                            className="w-11 h-11 rounded-xl flex items-center justify-center text-green-400 hover:bg-white/5 transition-colors touch-manipulation"
                            aria-label="Mark goal complete"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteGoal(goal.id)}
                            className="w-11 h-11 rounded-xl flex items-center justify-center text-red-400 hover:bg-white/5 transition-colors touch-manipulation"
                            aria-label="Delete goal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {goal.target_value && (
                        <>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm text-zinc-400">Progress</span>
                            <span className="text-sm font-bold text-white">
                              {goal.current_value} / {goal.target_value} {goal.unit}
                            </span>
                          </div>
                          <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${progress}%`,
                                background: goal.category === 'business'
                                  ? '#620E06'
                                  : goal.category === 'fitness'
                                  ? '#425C59'
                                  : '#D5CBBA',
                              }}
                            />
                          </div>
                          <p className="text-xs text-zinc-600 mt-1">{Math.round(progress)}% complete</p>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-zinc-500 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-zinc-600" />
                Completed Goals
              </h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {completedGoals.map((goal) => (
                  <div key={goal.id} className="card opacity-50 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-brand-green flex-shrink-0" />
                    <span className="text-zinc-400 line-through">{goal.title}</span>
                    <button
                      type="button"
                      onClick={() => toggleGoalComplete(goal)}
                      className="ml-auto btn-ghost px-3 py-2 text-xs"
                    >
                      Reopen
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Goal Modal */}
      {showGoalModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowGoalModal(false)}>
          <div className="modal-content">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">{editingGoal ? 'Edit Goal' : 'Add Goal'}</h2>
              <button onClick={() => { setShowGoalModal(false); setEditingGoal(null) }} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Goal Title *</label>
                <input
                  type="text"
                  value={goalForm.title}
                  onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                  placeholder="What do you want to achieve?"
                  className="input"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Category</label>
                <select
                  value={goalForm.category}
                  onChange={(e) => setGoalForm({ ...goalForm, category: e.target.value as GoalCategory })}
                  className="select"
                >
                  <option value="business">💼 Business</option>
                  <option value="fitness">💪 Fitness</option>
                  <option value="personal">⭐ Personal</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Target</label>
                  <input
                    type="number"
                    value={goalForm.target_value}
                    onChange={(e) => setGoalForm({ ...goalForm, target_value: e.target.value })}
                    placeholder="100"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Current</label>
                  <input
                    type="number"
                    value={goalForm.current_value}
                    onChange={(e) => setGoalForm({ ...goalForm, current_value: e.target.value })}
                    placeholder="0"
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Unit</label>
                  <input
                    type="text"
                    value={goalForm.unit}
                    onChange={(e) => setGoalForm({ ...goalForm, unit: e.target.value })}
                    placeholder="kg, €, clients..."
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Deadline</label>
                <input
                  type="date"
                  value={goalForm.deadline}
                  onChange={(e) => setGoalForm({ ...goalForm, deadline: e.target.value })}
                  className="input"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowGoalModal(false); setEditingGoal(null) }} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button
                  onClick={saveGoal}
                  disabled={!goalForm.title || saving}
                  className="btn-primary flex-1 justify-center"
                >
                  {saving ? 'Saving...' : editingGoal ? 'Update Goal' : 'Add Goal'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Habit Modal */}
      {showHabitModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowHabitModal(false)}>
          <div className="modal-content">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Add Habit</h2>
              <button onClick={() => setShowHabitModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Habit Title *</label>
                <input
                  type="text"
                  value={habitForm.title}
                  onChange={(e) => setHabitForm({ ...habitForm, title: e.target.value })}
                  placeholder="Train for 45 min, Drink 3L water..."
                  className="input"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-3">Icon</label>
                <div className="grid grid-cols-6 gap-2">
                  {HABIT_ICONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setHabitForm({ ...habitForm, icon })}
                      className={`h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                        habitForm.icon === icon
                          ? 'bg-brand-burgundy/30 border border-brand-burgundy/60'
                          : 'bg-zinc-800 hover:bg-zinc-700'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowHabitModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button
                  onClick={saveHabit}
                  disabled={!habitForm.title || saving}
                  className="btn-primary flex-1 justify-center"
                >
                  {saving ? 'Saving...' : 'Add Habit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
