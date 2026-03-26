'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Dumbbell, Plus, ChevronLeft, ChevronRight, RefreshCw,
  Clock, Zap, X, Save, Loader2, Trash2, Activity,
} from 'lucide-react'
import {
  format, startOfISOWeek, endOfISOWeek, addDays, subWeeks, addWeeks,
  isToday, isSameDay, parseISO, isThisISOWeek,
} from 'date-fns'

// ─── Types ──────────────────────────────────────────────────────────────────

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
  duration_min: number | null
  energy_level: number | null
  exercises: Exercise[]
  notes: string | null
  created_at: string
}

interface WeekStats {
  workouts: number
  totalMinutes: number
  avgEnergy: number | null
}

const WORKOUT_TYPES = [
  { value: 'push', label: 'Push', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'pull', label: 'Pull', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'full_body', label: 'Full Body', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'cardio', label: 'Cardio', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 'group', label: 'Group', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
  { value: 'other', label: 'Other', color: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30' },
]

function typeStyle(type: string) {
  return WORKOUT_TYPES.find((t) => t.value === type)?.color || WORKOUT_TYPES[5].color
}
function typeLabel(type: string) {
  return WORKOUT_TYPES.find((t) => t.value === type)?.label || type
}

function EnergyDots({ level, onClick }: { level: number | null; onClick?: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onClick?.(n)}
          className={`w-3 h-3 rounded-full transition-colors ${
            (level || 0) >= n ? 'bg-brand-amber' : 'bg-zinc-700'
          } ${onClick ? 'cursor-pointer hover:bg-brand-amber/60' : 'cursor-default'}`}
        />
      ))}
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────

export default function TrainingPage() {
  const [logs, setLogs] = useState<TrainingLog[]>([])
  const [weekStats, setWeekStats] = useState<WeekStats>({ workouts: 0, totalMinutes: 0, avgEnergy: null })
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [formType, setFormType] = useState('push')
  const [formDuration, setFormDuration] = useState('')
  const [formEnergy, setFormEnergy] = useState<number | null>(null)
  const [formNotes, setFormNotes] = useState('')
  const [formExercises, setFormExercises] = useState<Exercise[]>([])

  const fetchLogs = useCallback(() => {
    setLoading(true)
    fetch('/api/training?days=60')
      .then((r) => r.json())
      .then((d) => {
        setLogs(d.logs || [])
        setWeekStats(d.weekStats || { workouts: 0, totalMinutes: 0, avgEnergy: null })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  // Week calendar
  const currentWeekStart = startOfISOWeek(addWeeks(new Date(), weekOffset))
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))

  function logForDay(day: Date) {
    const ds = format(day, 'yyyy-MM-dd')
    return logs.find((l) => l.date === ds)
  }

  function resetForm() {
    setFormDate(format(new Date(), 'yyyy-MM-dd'))
    setFormType('push')
    setFormDuration('')
    setFormEnergy(null)
    setFormNotes('')
    setFormExercises([])
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: formDate,
          workout_type: formType,
          duration_min: formDuration ? parseInt(formDuration, 10) : null,
          energy_level: formEnergy,
          exercises: formExercises.filter((e) => e.name.trim()),
          notes: formNotes || null,
        }),
      })
      if (res.ok) {
        setShowForm(false)
        resetForm()
        fetchLogs()
      }
    } finally {
      setSaving(false)
    }
  }

  function addExercise() {
    setFormExercises([...formExercises, { name: '', sets: 3, reps: 12, weight_kg: null }])
  }

  function updateExercise(i: number, patch: Partial<Exercise>) {
    setFormExercises(formExercises.map((e, j) => (j === i ? { ...e, ...patch } : e)))
  }

  function removeExercise(i: number) {
    setFormExercises(formExercises.filter((_, j) => j !== i))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Dumbbell className="w-7 h-7 text-brand-burgundy" />
            Training Log
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Track your workouts and progress</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchLogs} className="p-2 text-zinc-500 hover:text-white transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => { setShowForm(!showForm); if (!showForm) resetForm() }}
            className="btn-primary flex items-center gap-2"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cancel' : 'Log Workout'}
          </button>
        </div>
      </div>

      {/* Weekly Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <div className="text-2xl font-bold text-white">{weekStats.workouts}</div>
          <div className="text-xs text-zinc-500 mt-1">Workouts this week</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-white">{weekStats.totalMinutes}<span className="text-sm text-zinc-500 ml-1">min</span></div>
          <div className="text-xs text-zinc-500 mt-1">Total minutes</div>
        </div>
        <div className="card text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl font-bold text-white">{weekStats.avgEnergy ?? '–'}</span>
            <Zap className="w-4 h-4 text-brand-amber" />
          </div>
          <div className="text-xs text-zinc-500 mt-1">Avg energy</div>
        </div>
      </div>

      {/* Week Calendar Strip */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setWeekOffset((o) => o - 1)} className="p-1 text-zinc-500 hover:text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-zinc-400 font-medium">
            {format(currentWeekStart, 'MMM d')} – {format(endOfISOWeek(currentWeekStart), 'MMM d, yyyy')}
          </span>
          <button
            onClick={() => setWeekOffset((o) => o + 1)}
            disabled={weekOffset >= 0}
            className="p-1 text-zinc-500 hover:text-white disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const log = logForDay(day)
            const today = isToday(day)
            return (
              <div
                key={day.toISOString()}
                className={`flex flex-col items-center py-3 rounded-lg transition-colors ${
                  today ? 'bg-brand-burgundy/10 border border-brand-burgundy/30' : 'bg-zinc-800/50'
                }`}
              >
                <span className="text-xs text-zinc-500 uppercase">{format(day, 'EEE')}</span>
                <span className={`text-lg font-semibold mt-1 ${today ? 'text-brand-burgundy' : 'text-white'}`}>
                  {format(day, 'd')}
                </span>
                {log ? (
                  <div className={`mt-2 text-xs px-2 py-0.5 rounded-full border ${typeStyle(log.workout_type)}`}>
                    {typeLabel(log.workout_type)}
                  </div>
                ) : (
                  <div className="mt-2 w-2 h-2 rounded-full bg-zinc-700" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Log Workout Form */}
      {showForm && (
        <div className="card border border-brand-burgundy/30">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-brand-burgundy" />
            Log Workout
          </h2>
          <div className="space-y-4">
            {/* Date & Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Date</label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Workout Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  {WORKOUT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Duration & Energy */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Duration (min)</label>
                <input
                  type="number"
                  value={formDuration}
                  onChange={(e) => setFormDuration(e.target.value)}
                  placeholder="60"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Energy Level</label>
                <div className="flex items-center gap-2 h-[38px]">
                  <EnergyDots level={formEnergy} onClick={(n) => setFormEnergy(n === formEnergy ? null : n)} />
                  {formEnergy && <span className="text-xs text-zinc-400">{formEnergy}/5</span>}
                </div>
              </div>
            </div>

            {/* Exercises */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-zinc-500">Exercises</label>
                <button type="button" onClick={addExercise} className="text-xs text-brand-burgundy hover:text-white flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add Exercise
                </button>
              </div>
              {formExercises.length === 0 ? (
                <p className="text-xs text-zinc-600 italic">No exercises added yet</p>
              ) : (
                <div className="space-y-2">
                  {formExercises.map((ex, i) => (
                    <div key={i} className="flex items-center gap-2 bg-zinc-800/50 rounded-lg p-2">
                      <input
                        type="text"
                        value={ex.name}
                        onChange={(e) => updateExercise(i, { name: e.target.value })}
                        placeholder="Exercise name"
                        className="flex-1 bg-transparent border-b border-zinc-700 text-sm text-white px-1 py-1 focus:outline-none focus:border-brand-burgundy"
                      />
                      <input
                        type="number"
                        value={ex.sets}
                        onChange={(e) => updateExercise(i, { sets: parseInt(e.target.value, 10) || 0 })}
                        className="w-14 bg-transparent border-b border-zinc-700 text-sm text-white text-center py-1 focus:outline-none focus:border-brand-burgundy"
                        placeholder="Sets"
                      />
                      <span className="text-zinc-600 text-xs">×</span>
                      <input
                        type="number"
                        value={ex.reps}
                        onChange={(e) => updateExercise(i, { reps: parseInt(e.target.value, 10) || 0 })}
                        className="w-14 bg-transparent border-b border-zinc-700 text-sm text-white text-center py-1 focus:outline-none focus:border-brand-burgundy"
                        placeholder="Reps"
                      />
                      <input
                        type="number"
                        value={ex.weight_kg ?? ''}
                        onChange={(e) => updateExercise(i, { weight_kg: e.target.value ? parseFloat(e.target.value) : null })}
                        className="w-16 bg-transparent border-b border-zinc-700 text-sm text-white text-center py-1 focus:outline-none focus:border-brand-burgundy"
                        placeholder="kg"
                      />
                      <button type="button" onClick={() => removeExercise(i)} className="text-zinc-600 hover:text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Notes</label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={2}
                placeholder="How did it feel? Any PRs?"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white resize-none"
              />
            </div>

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Workout'}
            </button>
          </div>
        </div>
      )}

      {/* Recent Workouts */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Recent Workouts</h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
          </div>
        ) : logs.length === 0 ? (
          <div className="card text-center py-12">
            <Dumbbell className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500">No workouts logged yet</p>
            <p className="text-zinc-600 text-sm mt-1">Hit &quot;Log Workout&quot; to get started 💪</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="card hover:border-zinc-700 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-full border text-xs font-medium ${typeStyle(log.workout_type)}`}>
                      {typeLabel(log.workout_type)}
                    </div>
                    <span className="text-sm text-zinc-400">
                      {format(parseISO(log.date), 'EEE, MMM d')}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    {log.duration_min && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {log.duration_min} min
                      </span>
                    )}
                    {log.energy_level && <EnergyDots level={log.energy_level} />}
                  </div>
                </div>
                {log.exercises && log.exercises.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {log.exercises.map((ex, i) => (
                      <span key={i} className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded-md">
                        {ex.name} {ex.sets}×{ex.reps}{ex.weight_kg ? ` @ ${ex.weight_kg}kg` : ''}
                      </span>
                    ))}
                  </div>
                )}
                {log.notes && (
                  <p className="mt-2 text-sm text-zinc-500 italic">{log.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
