'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, RefreshCw, Target, Flame,
  Crosshair, Users, Trophy, CheckCircle2, Circle, TrendingUp,
  BookOpen, Save, Loader2, BarChart3,
} from 'lucide-react'
import {
  format, startOfISOWeek, endOfISOWeek,
  subWeeks, addWeeks, isThisISOWeek, parseISO,
} from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HabitBreakdown {
  id: string
  title: string
  icon: string
  days_completed: number
}

interface FocusDay {
  date: string
  set: number
  done: number
}

interface ReviewData {
  week_start: string
  week_end: string
  score: number
  score_label: string
  habits: {
    total_active: number
    total_possible: number
    completed: number
    rate: number
    breakdown: HabitBreakdown[]
  }
  focus: {
    days_with_tasks: number
    total_tasks: number
    completed_tasks: number
    rate: number
    by_day: FocusDay[]
  }
  goals: {
    total: number
    completed: number
    on_track: number
    rate: number
  }
  clients: {
    new_leads: number
    interactions: number
    rate: number
  }
  reflection: {
    id: string
    week_start: string
    wins: string | null
    lessons: string | null
    next_focus: string | null
    score: number | null
    updated_at?: string
    created_at?: string
  } | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 90) return { ring: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/30', text: 'text-amber-400' }
  if (score >= 75) return { ring: 'text-brand-green', bg: 'bg-brand-green/10', border: 'border-brand-green/30', text: 'text-brand-green' }
  if (score >= 60) return { ring: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30', text: 'text-blue-400' }
  if (score >= 45) return { ring: 'text-brand-amber', bg: 'bg-brand-amber/10', border: 'border-brand-amber/30', text: 'text-brand-amber' }
  return { ring: 'text-zinc-500', bg: 'bg-zinc-500/10', border: 'border-zinc-500/30', text: 'text-zinc-400' }
}

function RateBar({ rate, color }: { rate: number; color: string }) {
  return (
    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${rate}%` }}
      />
    </div>
  )
}

function ScoreRing({ score }: { score: number }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const colors = scoreColor(score)

  return (
    <div className="relative flex items-center justify-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#27272a" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={radius} fill="none"
          stroke="currentColor"
          className={colors.ring}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className={`text-3xl font-bold ${colors.text}`}>{score}</div>
        <div className="text-zinc-500 text-xs">/ 100</div>
      </div>
    </div>
  )
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WeeklyReviewPage() {
  const [anchor, setAnchor] = useState(new Date())
  const [data, setData] = useState<ReviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Reflection form state
  const [wins,      setWins]      = useState('')
  const [lessons,   setLessons]   = useState('')
  const [nextFocus, setNextFocus] = useState('')

  const weekStart = startOfISOWeek(anchor)
  const weekEnd   = endOfISOWeek(anchor)
  const isCurrentWeek = isThisISOWeek(anchor)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const dateStr = format(anchor, 'yyyy-MM-dd')
      const res = await fetch(`/api/review?week=${dateStr}`)
      const json: ReviewData = await res.json()
      setData(json)
      setWins(json.reflection?.wins ?? '')
      setLessons(json.reflection?.lessons ?? '')
      setNextFocus(json.reflection?.next_focus ?? '')
    } finally {
      setLoading(false)
    }
  }, [anchor])

  useEffect(() => { fetchData() }, [fetchData])

  const saveReflection = async () => {
    if (!data) return
    setSaving(true)
    try {
      await fetch('/api/review/reflection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week_start: data.week_start,
          wins,
          lessons,
          next_focus: nextFocus,
          score: data.score,
        }),
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  const goBack    = () => setAnchor(prev => subWeeks(prev, 1))
  const goForward = () => {
    if (!isCurrentWeek) setAnchor(prev => addWeeks(prev, 1))
  }

  const colors = data ? scoreColor(data.score) : scoreColor(0)

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="w-6 h-6 text-brand-burgundy" />
              Weekly Review
            </h1>
            <p className="text-zinc-500 text-sm mt-1">
              {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
              {isCurrentWeek && <span className="ml-2 text-xs text-brand-green font-medium">Current week</span>}
            </p>
          </div>

          {/* Week navigation */}
          <div className="flex items-center gap-2">
            <button onClick={goBack} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goForward}
              disabled={isCurrentWeek}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={fetchData}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="card h-40 skeleton" />)}
          </div>
        ) : !data ? (
          <div className="card text-center py-16 text-zinc-500">Failed to load review data.</div>
        ) : (
          <>
            {/* ── Score hero ── */}
            <div className={`card mb-6 ${colors.bg} ${colors.border} border`}>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <ScoreRing score={data.score} />
                <div className="flex-1 text-center sm:text-left">
                  <div className={`text-3xl font-bold mb-1 ${colors.text}`}>{data.score_label}</div>
                  <p className="text-zinc-400 text-sm mb-4">
                    Accountability score for the week of {format(parseISO(data.week_start), 'MMM d')}
                  </p>
                  {/* Score breakdown bars */}
                  <div className="space-y-3 max-w-sm">
                    <div>
                      <div className="flex justify-between text-xs text-zinc-500 mb-1">
                        <span className="flex items-center gap-1"><Flame className="w-3 h-3" /> Habits</span>
                        <span className={colors.text}>{data.habits.rate}% <span className="text-zinc-600">(35pts)</span></span>
                      </div>
                      <RateBar rate={data.habits.rate} color={data.habits.rate >= 70 ? 'bg-brand-green' : data.habits.rate >= 50 ? 'bg-brand-amber' : 'bg-red-500'} />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-zinc-500 mb-1">
                        <span className="flex items-center gap-1"><Crosshair className="w-3 h-3" /> Big 3 Focus</span>
                        <span className={colors.text}>{data.focus.rate}% <span className="text-zinc-600">(30pts)</span></span>
                      </div>
                      <RateBar rate={data.focus.rate} color={data.focus.rate >= 70 ? 'bg-brand-burgundy' : data.focus.rate >= 50 ? 'bg-brand-amber' : 'bg-red-500'} />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-zinc-500 mb-1">
                        <span className="flex items-center gap-1"><Target className="w-3 h-3" /> Goals</span>
                        <span className={colors.text}>{data.goals.rate}% <span className="text-zinc-600">(20pts)</span></span>
                      </div>
                      <RateBar rate={data.goals.rate} color={data.goals.rate >= 70 ? 'bg-blue-400' : data.goals.rate >= 50 ? 'bg-brand-amber' : 'bg-red-500'} />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-zinc-500 mb-1">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Clients</span>
                        <span className={colors.text}>{data.clients.rate}% <span className="text-zinc-600">(15pts)</span></span>
                      </div>
                      <RateBar rate={data.clients.rate} color={data.clients.rate >= 70 ? 'bg-purple-400' : data.clients.rate >= 50 ? 'bg-brand-amber' : 'bg-red-500'} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Quick stats ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="card text-center">
                <div className="text-3xl font-bold text-brand-green mb-1">{data.habits.completed}</div>
                <div className="text-zinc-500 text-xs">Habit check-ins</div>
                <div className="text-zinc-600 text-xs">of {data.habits.total_possible} possible</div>
              </div>
              <div className="card text-center">
                <div className="text-3xl font-bold text-brand-burgundy mb-1">{data.focus.completed_tasks}</div>
                <div className="text-zinc-500 text-xs">Tasks completed</div>
                <div className="text-zinc-600 text-xs">of {data.focus.total_tasks} set</div>
              </div>
              <div className="card text-center">
                <div className="text-3xl font-bold text-blue-400 mb-1">{data.goals.on_track}</div>
                <div className="text-zinc-500 text-xs">Goals on track</div>
                <div className="text-zinc-600 text-xs">of {data.goals.total} total</div>
              </div>
              <div className="card text-center">
                <div className="text-3xl font-bold text-purple-400 mb-1">{data.clients.interactions}</div>
                <div className="text-zinc-500 text-xs">Client interactions</div>
                <div className="text-zinc-600 text-xs">{data.clients.new_leads} new leads</div>
              </div>
            </div>

            {/* ── Habits breakdown + Focus heatmap ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

              {/* Habit breakdown */}
              <div className="card">
                <h2 className="font-semibold text-white flex items-center gap-2 mb-4">
                  <Flame className="w-4 h-4 text-brand-green" />
                  Habit Consistency
                </h2>
                {data.habits.breakdown.length === 0 ? (
                  <p className="text-zinc-500 text-sm">No active habits found.</p>
                ) : (
                  <div className="space-y-3">
                    {data.habits.breakdown.map(h => {
                      const rate = Math.round((h.days_completed / 7) * 100)
                      return (
                        <div key={h.id}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-zinc-300">{h.icon} {h.title}</span>
                            <span className="text-zinc-500 text-xs">{h.days_completed}/7 days</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${rate >= 70 ? 'bg-brand-green' : rate >= 50 ? 'bg-brand-amber' : 'bg-red-500'}`}
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                            <span className={`text-xs w-8 text-right ${rate >= 70 ? 'text-brand-green' : rate >= 50 ? 'text-brand-amber' : 'text-red-400'}`}>
                              {rate}%
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Focus by day */}
              <div className="card">
                <h2 className="font-semibold text-white flex items-center gap-2 mb-4">
                  <Crosshair className="w-4 h-4 text-brand-burgundy" />
                  Big 3 — Day by Day
                </h2>
                <div className="space-y-2">
                  {data.focus.by_day.map((d, i) => {
                    const label = DAY_LABELS[i] ?? d.date
                    const noTasks = d.set === 0
                    const allDone = !noTasks && d.done === d.set
                    const partial = !noTasks && d.done > 0 && d.done < d.set
                    const none    = !noTasks && d.done === 0
                    return (
                      <div key={d.date} className="flex items-center gap-3">
                        <span className="text-xs text-zinc-600 w-8">{label}</span>
                        <div className="flex gap-1">
                          {noTasks ? (
                            <span className="text-zinc-700 text-xs italic">—</span>
                          ) : (
                            Array.from({ length: d.set }).map((_, j) => (
                              j < d.done
                                ? <CheckCircle2 key={j} className="w-4 h-4 text-brand-green" />
                                : <Circle       key={j} className="w-4 h-4 text-zinc-700" />
                            ))
                          )}
                        </div>
                        <span className="text-xs ml-auto">
                          {noTasks
                            ? <span className="text-zinc-700">No tasks</span>
                            : allDone ? <span className="text-brand-green">✓ All done</span>
                            : partial ? <span className="text-brand-amber">{d.done}/{d.set}</span>
                            : none    ? <span className="text-red-400">0/{d.set}</span>
                            : null
                          }
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Weekly completion</span>
                  <span className={`font-semibold ${data.focus.rate >= 70 ? 'text-brand-green' : data.focus.rate >= 50 ? 'text-brand-amber' : 'text-red-400'}`}>
                    {data.focus.rate}%
                  </span>
                </div>
              </div>
            </div>

            {/* ── Reflection Journal ── */}
            <div className="card">
              <h2 className="font-semibold text-white flex items-center gap-2 mb-6">
                <BookOpen className="w-4 h-4 text-brand-amber" />
                Weekly Reflection
                {data.reflection && (
                  <span className="ml-auto text-xs text-zinc-600">
                    Last saved {format(parseISO(data.reflection.updated_at ?? data.reflection.week_start), 'MMM d HH:mm')}
                  </span>
                )}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Wins */}
                <div>
                  <label className="block text-xs font-semibold text-brand-green uppercase tracking-widest mb-2">
                    🏆 Wins this week
                  </label>
                  <textarea
                    value={wins}
                    onChange={e => setWins(e.target.value)}
                    placeholder="What went really well? What are you proud of?"
                    rows={5}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 resize-none focus:outline-none focus:border-brand-green/50 transition-colors"
                  />
                </div>

                {/* Lessons */}
                <div>
                  <label className="block text-xs font-semibold text-brand-amber uppercase tracking-widest mb-2">
                    📚 Lessons learned
                  </label>
                  <textarea
                    value={lessons}
                    onChange={e => setLessons(e.target.value)}
                    placeholder="What didn't work? What would you do differently?"
                    rows={5}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 resize-none focus:outline-none focus:border-brand-amber/50 transition-colors"
                  />
                </div>

                {/* Next week focus */}
                <div>
                  <label className="block text-xs font-semibold text-brand-burgundy uppercase tracking-widest mb-2">
                    🎯 Next week focus
                  </label>
                  <textarea
                    value={nextFocus}
                    onChange={e => setNextFocus(e.target.value)}
                    placeholder="Top priority for next week. What's the ONE thing that matters most?"
                    rows={5}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 resize-none focus:outline-none focus:border-brand-burgundy/50 transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  onClick={saveReflection}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2 disabled:opacity-60"
                >
                  {saving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  ) : saveSuccess ? (
                    <><CheckCircle2 className="w-4 h-4 text-brand-green" /> Saved!</>
                  ) : (
                    <><Save className="w-4 h-4" /> Save Reflection</>
                  )}
                </button>
              </div>
            </div>

            {/* ── Trend insight footer ── */}
            <div className="mt-4 p-4 rounded-xl border border-zinc-800 bg-zinc-900/50 flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-brand-amber flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-zinc-400">
                  <span className="text-white font-medium">How to read this score: </span>
                  Habits (35%) + Focus tasks (30%) + Goals progress (20%) + Client activity (15%).
                  Aim for <span className="text-brand-green font-medium">75+</span> consistently to build unstoppable momentum.
                </p>
              </div>
              <BarChart3 className="w-5 h-5 text-zinc-700 flex-shrink-0 mt-0.5 ml-auto" />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
