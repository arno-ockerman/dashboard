'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Crosshair, CheckCircle2, Circle, Flame, Users, Calendar,
  ArrowRight, RefreshCw, Zap, AlertCircle, Instagram,
  TrendingUp, Target, Clock, Trophy, Sparkles,
  ChevronRight,
} from 'lucide-react'
import { format, parseISO, isToday, isPast } from 'date-fns'
import { nl } from 'date-fns/locale'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Big3Task {
  text: string | null
  done: boolean
}

interface Habit {
  id: string
  name: string
  icon: string | null
  target: number | null
  unit: string | null
  completed: boolean
}

interface ClientAlert {
  id: string
  name: string
  status: string
  next_follow_up: string | null
  next_action: string | null
  last_contact: string | null
  tags: string[]
}

interface ContentItem {
  id: string
  title: string
  platform: string
  post_type: string
  status: string
  scheduled_date: string | null
}

interface BriefData {
  today: string
  greeting: string
  big3: {
    tasks: Big3Task[]
    done: number
    total: number
    set: boolean
  }
  habits: {
    items: Habit[]
    done: number
    total: number
    streak: number
  }
  clients_attention: ClientAlert[]
  content_today: ContentItem[]
  week: {
    score: number
    habit_rate: number
    focus_rate: number
    start: string
    end: string
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  lead: 'text-zinc-300',
  prospect: 'text-blue-300',
  active: 'text-green-300',
  vip: 'text-amber-300',
  inactive: 'text-zinc-500',
}

const STATUS_BG: Record<string, string> = {
  lead: 'bg-zinc-700',
  prospect: 'bg-blue-900/50',
  active: 'bg-green-900/50',
  vip: 'bg-amber-900/40',
  inactive: 'bg-zinc-800',
}

function scoreLabel(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'Elite 🔥', color: 'text-amber-400' }
  if (score >= 75) return { label: 'Strong 💪', color: 'text-green-400' }
  if (score >= 55) return { label: 'Solid ✅', color: 'text-blue-400' }
  if (score >= 35) return { label: 'Fair 📈', color: 'text-zinc-300' }
  return { label: 'Needs Work', color: 'text-zinc-500' }
}

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = (size - 12) / 2
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const { color } = scoreLabel(score)
  const strokeColor = color.replace('text-', '')
  const colorMap: Record<string, string> = {
    'amber-400': '#fbbf24',
    'green-400': '#4ade80',
    'blue-400': '#60a5fa',
    'zinc-300': '#d4d4d8',
    'zinc-500': '#71717a',
  }
  const stroke = colorMap[strokeColor] ?? '#fbbf24'

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#27272a" strokeWidth={10} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={stroke} strokeWidth={10}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
    </svg>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DailyBriefPage() {
  const [data, setData] = useState<BriefData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [togglingHabit, setTogglingHabit] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/brief', { cache: 'no-store' })
      const json = await res.json()
      setData(json)
      setLastRefresh(new Date())
    } finally {
      setLoading(false)
    }
  }, [])

  const toggleHabit = async (habitId: string, completed: boolean) => {
    const newCompleted = !completed
    // Optimistic UI update — no page reload
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        habits: {
          ...prev.habits,
          items: prev.habits.items.map((h) =>
            h.id === habitId ? { ...h, completed: newCompleted } : h
          ),
          done: prev.habits.items.filter((h) =>
            h.id === habitId ? newCompleted : h.completed
          ).length,
        },
      }
    })
    setTogglingHabit(habitId)
    try {
      const res = await fetch(`/api/habits/${habitId}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: newCompleted }),
      })
      if (!res.ok) {
        // Revert
        setData((prev) => {
          if (!prev) return prev
          return {
            ...prev,
            habits: {
              ...prev.habits,
              items: prev.habits.items.map((h) =>
                h.id === habitId ? { ...h, completed } : h
              ),
              done: prev.habits.items.filter((h) =>
                h.id === habitId ? completed : h.completed
              ).length,
            },
          }
        })
      }
    } catch {
      // silent revert
    } finally {
      setTogglingHabit(null)
    }
  }

  useEffect(() => {
    load()
    // Auto-refresh every 5 minutes
    const t = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(t)
  }, [load])

  if (loading && !data) {
    return (
      <div className="p-6 space-y-4">
        <div className="skeleton h-24 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-48 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2].map((i) => <div key={i} className="skeleton h-36 rounded-xl" />)}
        </div>
      </div>
    )
  }

  const today = data?.today ?? format(new Date(), 'yyyy-MM-dd')
  const todayLabel = format(parseISO(today), 'EEEE d MMMM yyyy', { locale: nl })
  const { label: weekLabel, color: weekColor } = scoreLabel(data?.week.score ?? 0)

  const big3All = data?.big3.tasks ?? []
  const habitsAll = data?.habits.items ?? []

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">

      {/* ── Hero Header ───────────────────────────────────────────────────── */}
      <div className="card bg-gradient-to-br from-zinc-900 via-zinc-900 to-brand-burgundy/10 border-brand-burgundy/20">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-brand-amber" />
              <span className="text-xs text-zinc-500 uppercase tracking-wider">Daily Brief</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
              {data?.greeting}, Arno 👊
            </h1>
            <p className="text-zinc-400 text-sm capitalize">{todayLabel}</p>
          </div>

          {/* Week score */}
          <div className="flex-shrink-0 flex flex-col items-center gap-1">
            <div className="relative">
              <ScoreRing score={data?.week.score ?? 0} size={72} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-white">{data?.week.score ?? 0}</span>
              </div>
            </div>
            <span className={`text-xs font-medium ${weekColor}`}>{weekLabel}</span>
            <Link href="/review" className="text-xs text-zinc-600 hover:text-zinc-400">
              Deze week
            </Link>
          </div>
        </div>

        {/* Progress summary */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-zinc-800">
          <div className="text-center">
            <div className="text-xl font-bold text-brand-amber">{data?.big3.done ?? 0}/{data?.big3.total || 3}</div>
            <div className="text-xs text-zinc-500">Big 3</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-green-400">{data?.habits.done ?? 0}/{data?.habits.total ?? 0}</div>
            <div className="text-xs text-zinc-500">Habits</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-orange-400 flex items-center justify-center gap-1">
              <Flame className="w-4 h-4" />{data?.habits.streak ?? 0}
            </div>
            <div className="text-xs text-zinc-500">Streak</div>
          </div>
        </div>

        <div className="flex items-center justify-end mt-3">
          <button
            onClick={load}
            disabled={loading}
            className="text-xs text-zinc-600 hover:text-zinc-400 flex items-center gap-1 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            {format(lastRefresh, 'HH:mm')}
          </button>
        </div>
      </div>

      {/* ── Main Grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Big 3 Focus */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-brand-amber" />
              Big 3 — Vandaag
            </h2>
            <Link href="/focus" className="text-xs text-zinc-500 hover:text-white flex items-center gap-1">
              Focus <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {!data?.big3.set ? (
            <div className="text-center py-6">
              <p className="text-zinc-500 text-sm mb-3">Nog geen Big 3 ingesteld voor vandaag</p>
              <Link href="/focus" className="btn-primary mx-auto text-xs">
                <Crosshair className="w-3 h-3" /> Stel je Big 3 in
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {big3All.map((t, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                    t.done
                      ? 'bg-green-950/30 border-green-900/40'
                      : 'bg-zinc-800/50 border-zinc-700/50'
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {t.done ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-zinc-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm ${t.done ? 'text-zinc-500 line-through' : 'text-white'}`}>
                      {t.text}
                    </span>
                  </div>
                  <span className="text-xs text-zinc-600 flex-shrink-0">#{i + 1}</span>
                </div>
              ))}

              {big3All.length < 3 && (
                <Link
                  href="/focus"
                  className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-zinc-700 text-zinc-600 hover:text-zinc-400 hover:border-zinc-600 transition-all text-sm"
                >
                  <Circle className="w-4 h-4" />
                  Taak {big3All.length + 1} toevoegen...
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Habits */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-green-400" />
              Habits
              {(data?.habits.streak ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-orange-400 bg-orange-950/40 border border-orange-900/30 px-2 py-0.5 rounded-full">
                  <Flame className="w-3 h-3" /> {data?.habits.streak}
                </span>
              )}
            </h2>
            <Link href="/goals" className="text-xs text-zinc-500 hover:text-white flex items-center gap-1">
              Goals <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {habitsAll.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-zinc-500 text-sm mb-3">Nog geen habits ingesteld</p>
              <Link href="/goals" className="btn-primary mx-auto text-xs">
                <Target className="w-3 h-3" /> Habits instellen
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {habitsAll.map((h) => (
                <button
                  key={h.id}
                  onClick={() => toggleHabit(h.id, h.completed)}
                  disabled={togglingHabit === h.id}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left active:scale-[0.99] touch-manipulation ${
                    h.completed
                      ? 'bg-green-950/20 border-green-900/30'
                      : 'bg-zinc-800/30 border-zinc-700/30 hover:bg-zinc-800/50'
                  } ${togglingHabit === h.id ? 'opacity-60' : ''}`}
                >
                  <span className="text-base w-5 text-center flex-shrink-0">
                    {h.icon ?? '🎯'}
                  </span>
                  <span className={`text-sm flex-1 ${h.completed ? 'text-zinc-500 line-through' : 'text-white'}`}>
                    {h.name}
                  </span>
                  {h.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-zinc-600 flex-shrink-0" />
                  )}
                </button>
              ))}

              {/* Progress bar */}
              <div className="mt-3 pt-3 border-t border-zinc-800">
                <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                  <span>{data?.habits.done ?? 0} / {data?.habits.total ?? 0} klaar</span>
                  <span>{data?.habits.total ? Math.round(((data.habits.done) / data.habits.total) * 100) : 0}%</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${data?.habits.total ? Math.round((data.habits.done / data.habits.total) * 100) : 0}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Clients needing attention */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              Follow-ups Vandaag
              {(data?.clients_attention.length ?? 0) > 0 && (
                <span className="w-5 h-5 rounded-full bg-brand-burgundy flex items-center justify-center text-xs text-white font-bold">
                  {data?.clients_attention.length}
                </span>
              )}
            </h2>
            <Link href="/clients" className="text-xs text-zinc-500 hover:text-white flex items-center gap-1">
              CRM <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {(data?.clients_attention.length ?? 0) === 0 ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-950/20 border border-green-900/30">
              <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
              <p className="text-sm text-green-300">Geen follow-ups gepland voor vandaag 🎉</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data?.clients_attention.map((c) => {
                const isOverdue = c.next_follow_up && isPast(parseISO(c.next_follow_up)) && !isToday(parseISO(c.next_follow_up))
                return (
                  <Link
                    key={c.id}
                    href={`/clients/${c.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 border border-zinc-700/50 hover:border-zinc-600 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-900/40 flex items-center justify-center text-sm font-bold text-blue-400 flex-shrink-0">
                      {c.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{c.name}</p>
                      {c.next_action && (
                        <p className="text-xs text-zinc-500 truncate">{c.next_action}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_BG[c.status]} ${STATUS_COLORS[c.status]}`}>
                        {c.status}
                      </span>
                      {isOverdue && (
                        <span className="flex items-center gap-1 text-xs text-red-400">
                          <AlertCircle className="w-3 h-3" /> te laat
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 flex-shrink-0" />
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Content today */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-brand-amber" />
              Content Vandaag
            </h2>
            <Link href="/content" className="text-xs text-zinc-500 hover:text-white flex items-center gap-1">
              Content <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {(data?.content_today.length ?? 0) === 0 ? (
            <div className="text-center py-6">
              <p className="text-zinc-500 text-sm mb-3">Geen content gepland voor vandaag</p>
              <Link href="/content" className="btn-primary mx-auto text-xs">
                <Calendar className="w-3 h-3" /> Content inplannen
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {data?.content_today.map((c) => {
                const statusColors: Record<string, string> = {
                  idea: 'text-zinc-400 bg-zinc-800',
                  draft: 'text-blue-400 bg-blue-900/40',
                  scheduled: 'text-amber-400 bg-amber-900/30',
                  published: 'text-green-400 bg-green-900/30',
                }
                const statusClass = statusColors[c.status] ?? 'text-zinc-400 bg-zinc-800'
                return (
                  <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                    <Instagram className="w-4 h-4 text-pink-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{c.title}</p>
                      <p className="text-xs text-zinc-500 capitalize">{c.post_type}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${statusClass}`}>
                      {c.status}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Week overview ─────────────────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-zinc-400" />
            Week Overzicht
          </h2>
          <Link href="/review" className="text-xs text-zinc-500 hover:text-white flex items-center gap-1">
            Weekly Review <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Score */}
          <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/30">
            <div className="relative mb-1">
              <ScoreRing score={data?.week.score ?? 0} size={56} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-white">{data?.week.score ?? 0}</span>
              </div>
            </div>
            <span className={`text-xs font-medium ${weekColor}`}>{weekLabel}</span>
            <span className="text-xs text-zinc-600 mt-0.5">Score</span>
          </div>

          {/* Habit rate */}
          <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/30">
            <div className="text-2xl font-bold text-green-400">{data?.week.habit_rate ?? 0}%</div>
            <div className="text-xs text-zinc-400 mt-1">Habits</div>
            <div className="w-full mt-2 h-1 bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full"
                style={{ width: `${data?.week.habit_rate ?? 0}%` }}
              />
            </div>
          </div>

          {/* Focus rate */}
          <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/30">
            <div className="text-2xl font-bold text-amber-400">{data?.week.focus_rate ?? 0}%</div>
            <div className="text-xs text-zinc-400 mt-1">Big 3 Set</div>
            <div className="w-full mt-2 h-1 bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full"
                style={{ width: `${data?.week.focus_rate ?? 0}%` }}
              />
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-brand-burgundy/10 border border-brand-burgundy/20 gap-2">
            <Trophy className="w-6 h-6 text-brand-amber" />
            <span className="text-xs text-zinc-400 text-center">Weekly Review invullen</span>
            <Link href="/review" className="text-xs text-brand-burgundy-light hover:text-white flex items-center gap-1 transition-colors">
              Open <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────────── */}
      <div className="card">
        <h2 className="font-semibold text-white flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-brand-amber" />
          Quick Links
        </h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { href: '/focus', label: 'Big 3', icon: Crosshair, color: 'text-amber-400 bg-amber-950/30 border-amber-900/20' },
            { href: '/goals', label: 'Habits', icon: Target, color: 'text-green-400 bg-green-950/30 border-green-900/20' },
            { href: '/clients', label: 'Clients', icon: Users, color: 'text-blue-400 bg-blue-950/30 border-blue-900/20' },
            { href: '/content', label: 'Content', icon: Instagram, color: 'text-pink-400 bg-pink-950/30 border-pink-900/20' },
            { href: '/review', label: 'Review', icon: Trophy, color: 'text-amber-400 bg-amber-950/30 border-amber-900/20' },
            { href: '/health', label: 'Health', icon: TrendingUp, color: 'text-red-400 bg-red-950/30 border-red-900/20' },
          ].map(({ href, label, icon: Icon, color }) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all hover:scale-105 ${color}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium text-zinc-300">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
