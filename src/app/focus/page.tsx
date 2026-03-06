'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  CheckCircle2, Circle, Flame, Timer, RotateCcw, Play, Pause,
  ChevronDown, ChevronUp, ArrowLeft, Zap, Target, Star,
  TrendingUp, Calendar, Award,
} from 'lucide-react'
import { format, subDays } from 'date-fns'

// ─── Motivational Quotes ────────────────────────────────────────────────────
const QUOTES = [
  'The secret of getting ahead is getting started. — Mark Twain',
  'Focus is the art of knowing what to ignore. — James Clear',
  'Do the hard work, especially when you don\'t feel like it. — Seth Godin',
  'Success is the sum of small efforts, repeated day in and day out. — Robert Collier',
  'The only way to do great work is to love what you do. — Steve Jobs',
  'Energy and persistence conquer all things. — Benjamin Franklin',
  'You don\'t rise to the level of your goals, you fall to the level of your systems. — James Clear',
  'It\'s not about having time. It\'s about making time. — Unknown',
  'Small steps, consistently taken, create massive results. — Unknown',
  'Discipline is choosing between what you want now and what you want most. — Abraham Lincoln',
  'Don\'t count the days. Make the days count. — Muhammad Ali',
  'The successful warrior is the average man with laser-like focus. — Bruce Lee',
  'Concentrate all your thoughts upon the work in hand. — Alexander Graham Bell',
  'Either you run the day or the day runs you. — Jim Rohn',
  'Productivity is never an accident. It is always the result of commitment to excellence. — Paul J. Meyer',
  'Where focus goes, energy flows. — Tony Robbins',
  'One task at a time. That\'s the secret. — Unknown',
  'The difference between successful people and very successful people is that very successful people say no to almost everything. — Warren Buffett',
  'Work like there is someone working 24 hours a day to take it away from you. — Mark Cuban',
  'Make each day your masterpiece. — John Wooden',
  'Champions keep playing until they get it right. — Billie Jean King',
  'Pain is temporary. Quitting lasts forever. — Lance Armstrong',
  'You have to fight to reach your dream. You have to sacrifice and work hard for it. — Lionel Messi',
  'If you want something you\'ve never had, you must do something you\'ve never done. — Unknown',
]

// ─── Types ──────────────────────────────────────────────────────────────────
interface FocusData {
  id?: string
  date: string
  task_1: string | null
  task_1_done: boolean
  task_2: string | null
  task_2_done: boolean
  task_3: string | null
  task_3_done: boolean
  reflection: string | null
  energy_level: number | null
  focus_score: number | null
  pomodoros_completed: number
}

interface HistoryEntry extends FocusData {
  id: string
}

// ─── Helper: play a beep sound via Web Audio API ────────────────────────────
function playBeep(type: 'work' | 'break') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    if (type === 'work') {
      // End of focus: 3 ascending beeps
      ;[0, 0.3, 0.6].forEach((t) => {
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.connect(g)
        g.connect(ctx.destination)
        o.frequency.value = 660 + t * 200
        g.gain.setValueAtTime(0.3, ctx.currentTime + t)
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.4)
        o.start(ctx.currentTime + t)
        o.stop(ctx.currentTime + t + 0.4)
      })
    } else {
      // End of break: 2 gentle beeps
      ;[0, 0.4].forEach((t) => {
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.connect(g)
        g.connect(ctx.destination)
        o.frequency.value = 440
        g.gain.setValueAtTime(0.2, ctx.currentTime + t)
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.5)
        o.start(ctx.currentTime + t)
        o.stop(ctx.currentTime + t + 0.5)
      })
    }
  } catch (_) {
    // AudioContext not available
  }
}

// ─── Circular Timer Component ────────────────────────────────────────────────
function CircularTimer({
  seconds,
  total,
  isBreak,
}: {
  seconds: number
  total: number
  isBreak: boolean
}) {
  const radius = 88
  const circumference = 2 * Math.PI * radius
  const progress = seconds / total
  const strokeDashoffset = circumference * (1 - progress)

  const mm = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')
  const ss = (seconds % 60).toString().padStart(2, '0')

  return (
    <div className="relative flex items-center justify-center w-52 h-52 mx-auto">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 200 200">
        {/* Track */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="#27272a"
          strokeWidth="10"
        />
        {/* Progress */}
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke={isBreak ? '#425C59' : '#620E06'}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="text-center z-10">
        <div
          className="text-5xl font-bold text-white tracking-widest"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        >
          {mm}:{ss}
        </div>
        <div className="text-xs text-zinc-400 mt-1 tracking-widest uppercase">
          {isBreak ? '☕ Break' : '🎯 Focus'}
        </div>
      </div>
    </div>
  )
}

// ─── Energy / Focus Rating ────────────────────────────────────────────────────
const ENERGY_EMOJIS = ['😴', '😐', '🙂', '💪', '🔥']
const FOCUS_EMOJIS = ['😵', '😶', '🧐', '🎯', '🚀']

function EmojiRating({
  label,
  emojis,
  value,
  onChange,
}: {
  label: string
  emojis: string[]
  value: number | null
  onChange: (v: number) => void
}) {
  return (
    <div>
      <p className="text-xs text-zinc-400 mb-2 uppercase tracking-wider">{label}</p>
      <div className="flex gap-2">
        {emojis.map((emoji, i) => (
          <button
            key={i}
            onClick={() => onChange(i + 1)}
            className={`text-2xl p-3 min-h-[44px] min-w-[44px] rounded-xl transition-all duration-200 touch-manipulation ${
              value === i + 1
                ? 'bg-brand-burgundy/30 scale-125 ring-2 ring-brand-burgundy'
                : 'hover:bg-zinc-800 hover:scale-110'
            }`}
            title={`${i + 1}/5`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function FocusPage() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)])

  // Focus data state
  const [focus, setFocus] = useState<FocusData>({
    date: today,
    task_1: '',
    task_1_done: false,
    task_2: '',
    task_2_done: false,
    task_3: '',
    task_3_done: false,
    reflection: '',
    energy_level: null,
    focus_score: null,
    pomodoros_completed: 0,
  })
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)

  // History & streak
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [streak, setStreak] = useState(0)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  // Reflection panel
  const [reflectionOpen, setReflectionOpen] = useState(false)

  // Pomodoro
  const WORK_TIME = 25 * 60
  const BREAK_TIME = 5 * 60
  const [pomSeconds, setPomSeconds] = useState(WORK_TIME)
  const [pomTotal, setPomTotal] = useState(WORK_TIME)
  const [isBreak, setIsBreak] = useState(false)
  const [running, setRunning] = useState(false)
  const pomIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pomRef = useRef({ seconds: WORK_TIME, isBreak: false, running: false })

  // ─── Load data ────────────────────────────────────────────────────────────
  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [todayRes, histRes] = await Promise.all([
        fetch(`/api/focus?date=${today}`),
        fetch('/api/focus?history=14'),
      ])
      const todayJson = await todayRes.json()
      const histJson = await histRes.json()

      if (todayJson.focus) {
        setFocus({
          ...todayJson.focus,
          task_1: todayJson.focus.task_1 || '',
          task_2: todayJson.focus.task_2 || '',
          task_3: todayJson.focus.task_3 || '',
          reflection: todayJson.focus.reflection || '',
        })
      }
      if (histJson.history) setHistory(histJson.history)
      if (typeof histJson.streak === 'number') setStreak(histJson.streak)
    } finally {
      setLoading(false)
    }
  }

  // ─── Debounced auto-save ──────────────────────────────────────────────────
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const scheduleSave = useCallback((data: FocusData) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      saveFocus(data)
    }, 800)
  }, [])

  const saveFocus = async (data: FocusData) => {
    setSaving(true)
    try {
      await fetch('/api/focus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      setSavedAt(new Date())
    } finally {
      setSaving(false)
    }
  }

  const updateFocus = (patch: Partial<FocusData>) => {
    setFocus((prev) => {
      const next = { ...prev, ...patch }
      scheduleSave(next)
      return next
    })
  }

  // ─── Pomodoro logic ───────────────────────────────────────────────────────
  useEffect(() => {
    pomRef.current = { seconds: pomSeconds, isBreak, running }
  }, [pomSeconds, isBreak, running])

  const startPomodoro = () => {
    setRunning(true)
    pomIntervalRef.current = setInterval(() => {
      const { seconds, isBreak: ib } = pomRef.current
      if (seconds <= 0) {
        // Switch phase
        const nextIsBreak = !ib
        const nextSeconds = nextIsBreak ? BREAK_TIME : WORK_TIME
        playBeep(ib ? 'break' : 'work')

        if (!ib) {
          // Work session just finished → increment pomodoro count
          setFocus((prev) => {
            const next = {
              ...prev,
              pomodoros_completed: (prev.pomodoros_completed || 0) + 1,
            }
            saveFocus(next)
            return next
          })
        }

        setIsBreak(nextIsBreak)
        setPomTotal(nextSeconds)
        setPomSeconds(nextSeconds)
      } else {
        setPomSeconds((s) => s - 1)
      }
    }, 1000)
  }

  const pausePomodoro = () => {
    setRunning(false)
    if (pomIntervalRef.current) clearInterval(pomIntervalRef.current)
  }

  const resetPomodoro = () => {
    pausePomodoro()
    setIsBreak(false)
    setPomSeconds(WORK_TIME)
    setPomTotal(WORK_TIME)
  }

  useEffect(() => () => { if (pomIntervalRef.current) clearInterval(pomIntervalRef.current) }, [])

  // ─── History helpers ──────────────────────────────────────────────────────
  const completionRate = (entry: HistoryEntry) => {
    const tasks = [entry.task_1, entry.task_2, entry.task_3].filter(Boolean)
    const done = [entry.task_1_done, entry.task_2_done, entry.task_3_done]
      .filter((_, i) => [entry.task_1, entry.task_2, entry.task_3][i])
      .filter(Boolean).length
    return tasks.length ? Math.round((done / tasks.length) * 100) : 0
  }

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
    return history.find((h) => h.date === d) || null
  })

  const completedTasks = [focus.task_1_done, focus.task_2_done, focus.task_3_done].filter(Boolean).length
  const totalTasks = [focus.task_1, focus.task_2, focus.task_3].filter(Boolean).length
  const allDone = totalTasks > 0 && completedTasks === totalTasks

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1
            className="text-4xl text-white tracking-widest uppercase"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            Big 3 Focus
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
          {streak > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-orange-400 text-sm font-semibold">{streak} day streak</span>
            </div>
          )}
        </div>
        <div className="text-right">
          {saving && <p className="text-xs text-zinc-500 animate-pulse">Saving…</p>}
          {!saving && savedAt && (
            <p className="text-xs text-zinc-600">
              Saved {format(savedAt, 'HH:mm')}
            </p>
          )}
        </div>
      </div>

      {/* Quote */}
      <div className="card mb-8 border-brand-burgundy/30 bg-gradient-to-r from-brand-burgundy/5 to-transparent">
        <p className="text-zinc-300 text-sm italic leading-relaxed">
          &ldquo;{quote}&rdquo;
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <div key={i} className="card skeleton h-20" />)}
        </div>
      ) : (
        <>
          {/* ── Big 3 Tasks ── */}
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-white flex items-center gap-2 text-lg">
                <Target className="w-5 h-5 text-brand-burgundy" />
                Today&apos;s Big 3
              </h2>
              {allDone && (
                <span className="text-brand-green text-sm font-semibold flex items-center gap-1">
                  <Award className="w-4 h-4" /> All done! 🎉
                </span>
              )}
              {!allDone && totalTasks > 0 && (
                <span className="text-zinc-400 text-sm">{completedTasks}/{totalTasks} done</span>
              )}
            </div>
            <div className="space-y-4">
              {([1, 2, 3] as const).map((n) => {
                const taskKey = `task_${n}` as 'task_1' | 'task_2' | 'task_3'
                const doneKey = `task_${n}_done` as 'task_1_done' | 'task_2_done' | 'task_3_done'
                const taskValue = focus[taskKey] || ''
                const isDone = focus[doneKey]

                return (
                  <div key={n} className="flex items-center gap-3 group">
                    <button
                      onClick={() => {
                        if (!taskValue.trim()) return
                        updateFocus({ [doneKey]: !isDone })
                      }}
                      type="button"
                      className={`flex-shrink-0 p-2 rounded-xl transition-all duration-200 active:scale-95 touch-manipulation ${
                        taskValue.trim() ? 'cursor-pointer' : 'cursor-not-allowed opacity-30'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-9 h-9 text-brand-green drop-shadow-[0_0_8px_rgba(66,92,89,0.8)]" />
                      ) : (
                        <Circle className="w-9 h-9 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                      )}
                    </button>
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-600 select-none">
                        {n}
                      </span>
                      <input
                        type="text"
                        value={taskValue}
                        onChange={(e) => updateFocus({ [taskKey]: e.target.value })}
                        placeholder={
                          n === 1
                            ? 'Your most important task today…'
                            : n === 2
                            ? 'Second priority…'
                            : 'Third priority…'
                        }
                        className={`w-full bg-zinc-800 border rounded-xl px-3 py-3 pl-8 text-sm outline-none transition-all duration-200
                          focus:ring-2 focus:ring-brand-burgundy/50 focus:border-brand-burgundy/50
                          ${isDone
                            ? 'border-brand-green/30 text-zinc-500 line-through bg-brand-green/5'
                            : 'border-zinc-700 text-white hover:border-zinc-600'
                          }`}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* ── Pomodoro Timer ── */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-white flex items-center gap-2">
                  <Timer className="w-5 h-5 text-brand-burgundy" />
                  Pomodoro Timer
                </h2>
                <div className="flex items-center gap-1 text-xs text-zinc-500">
                  <Zap className="w-3 h-3 text-brand-amber" />
                  <span>{focus.pomodoros_completed} completed today</span>
                </div>
              </div>

              <CircularTimer
                seconds={pomSeconds}
                total={pomTotal}
                isBreak={isBreak}
              />

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 mt-6">
                {!running ? (
                  <button
                    onClick={startPomodoro}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 min-h-[44px] bg-brand-burgundy hover:bg-brand-burgundy-light text-white rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105 touch-manipulation"
                  >
                    <Play className="w-4 h-4" />
                    {pomSeconds === pomTotal ? 'Start' : 'Resume'}
                  </button>
                ) : (
                  <button
                    onClick={pausePomodoro}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 min-h-[44px] bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl text-sm font-semibold transition-all duration-200 touch-manipulation"
                  >
                    <Pause className="w-4 h-4" />
                    Pause
                  </button>
                )}
                <button
                  onClick={resetPomodoro}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 min-h-[44px] rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all duration-200 touch-manipulation"
                  title="Reset"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="sm:hidden">Reset</span>
                </button>
              </div>

              <div className="flex justify-center gap-6 mt-4 text-xs text-zinc-500">
                <span className={!isBreak ? 'text-brand-burgundy font-semibold' : ''}>
                  🎯 25 min Focus
                </span>
                <span className={isBreak ? 'text-brand-green font-semibold' : ''}>
                  ☕ 5 min Break
                </span>
              </div>
            </div>

            {/* ── Streak + Progress ── */}
            <div className="card">
              <h2 className="font-semibold text-white flex items-center gap-2 mb-5">
                <TrendingUp className="w-5 h-5 text-brand-green" />
                Your Progress
              </h2>

              {/* Streak */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-orange-900/20 to-transparent border border-orange-900/20 mb-4">
                <div className="text-4xl">🔥</div>
                <div>
                  <div
                    className="text-3xl font-bold text-white"
                    style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                  >
                    {streak}
                  </div>
                  <div className="text-xs text-zinc-400">Day Streak</div>
                </div>
                {streak >= 7 && <div className="ml-auto text-2xl">🏆</div>}
                {streak >= 3 && streak < 7 && <div className="ml-auto text-2xl">⭐</div>}
              </div>

              {/* Today's completion ring */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-800/50">
                <div className="relative w-14 h-14 flex-shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="22" fill="none" stroke="#3f3f46" strokeWidth="6" />
                    <circle
                      cx="28"
                      cy="28"
                      r="22"
                      fill="none"
                      stroke="#620E06"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 22}`}
                      strokeDashoffset={`${2 * Math.PI * 22 * (1 - (totalTasks > 0 ? completedTasks / totalTasks : 0))}`}
                      style={{ transition: 'stroke-dashoffset 0.5s' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                    {totalTasks > 0 ? `${Math.round((completedTasks / totalTasks) * 100)}%` : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">Today&apos;s Big 3</div>
                  <div className="text-zinc-400 text-xs">{completedTasks} of {totalTasks} tasks done</div>
                </div>
              </div>

              {/* Week dots */}
              <div className="mt-4">
                <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">Last 7 days</p>
                <div className="flex gap-1.5">
                  {last7.reverse().map((entry, i) => {
                    const d = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd')
                    const isToday = d === today
                    const hasData = entry && (entry.task_1 || entry.task_2 || entry.task_3)
                    const rate = entry ? completionRate(entry) : 0
                    return (
                      <div key={i} className="flex flex-col items-center gap-1 flex-1">
                        <div
                          className={`w-full h-8 rounded-md transition-all ${
                            !hasData
                              ? 'bg-zinc-800'
                              : rate === 100
                              ? 'bg-brand-green'
                              : rate >= 50
                              ? 'bg-brand-burgundy/60'
                              : 'bg-brand-burgundy/30'
                          } ${isToday ? 'ring-2 ring-white/30' : ''}`}
                          title={`${d}: ${rate}%`}
                        />
                        <span className="text-zinc-600 text-[10px]">
                          {format(subDays(new Date(), 6 - i), 'EEE')[0]}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ── Daily Reflection ── */}
          <div className="card mb-6">
            <button
              onClick={() => setReflectionOpen(!reflectionOpen)}
              className="w-full flex items-center justify-between"
            >
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Star className="w-5 h-5 text-brand-amber" />
                Daily Reflection
              </h2>
              {reflectionOpen ? (
                <ChevronUp className="w-4 h-4 text-zinc-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-zinc-400" />
              )}
            </button>

            {reflectionOpen && (
              <div className="mt-5 space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <EmojiRating
                    label="Energy Level"
                    emojis={ENERGY_EMOJIS}
                    value={focus.energy_level}
                    onChange={(v) => updateFocus({ energy_level: v })}
                  />
                  <EmojiRating
                    label="Focus Score"
                    emojis={FOCUS_EMOJIS}
                    value={focus.focus_score}
                    onChange={(v) => updateFocus({ focus_score: v })}
                  />
                </div>

                <div>
                  <p className="text-xs text-zinc-400 mb-2 uppercase tracking-wider">
                    Reflection — What did you learn? What will you do differently?
                  </p>
                  <textarea
                    value={focus.reflection || ''}
                    onChange={(e) => updateFocus({ reflection: e.target.value })}
                    placeholder="Write your reflection here…"
                    rows={4}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-sm text-white outline-none focus:ring-2 focus:ring-brand-burgundy/50 focus:border-brand-burgundy/50 resize-none transition-all"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── History ── */}
          <div className="card">
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className="w-full flex items-center justify-between"
            >
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                History (Last 7 days)
              </h2>
              {historyOpen ? (
                <ChevronUp className="w-4 h-4 text-zinc-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-zinc-400" />
              )}
            </button>

            {historyOpen && (
              <div className="mt-5 space-y-3">
                {Array.from({ length: 7 }, (_, i) => {
                  const d = format(subDays(new Date(), i), 'yyyy-MM-dd')
                  const entry = history.find((h) => h.date === d)
                  const isToday = d === today
                  return (
                    <div
                      key={d}
                      className={`p-4 rounded-xl border ${
                        isToday
                          ? 'border-brand-burgundy/40 bg-brand-burgundy/5'
                          : 'border-zinc-800 bg-zinc-800/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white">
                          {isToday ? 'Today' : format(new Date(d + 'T00:00:00'), 'EEEE, MMM d')}
                        </span>
                        {entry && (
                          <div className="flex items-center gap-2">
                            {entry.energy_level && (
                              <span title="Energy">{ENERGY_EMOJIS[entry.energy_level - 1]}</span>
                            )}
                            {entry.focus_score && (
                              <span title="Focus">{FOCUS_EMOJIS[entry.focus_score - 1]}</span>
                            )}
                            <span
                              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                completionRate(entry) === 100
                                  ? 'bg-brand-green/20 text-brand-green'
                                  : completionRate(entry) >= 50
                                  ? 'bg-brand-burgundy/20 text-red-300'
                                  : 'bg-zinc-700 text-zinc-400'
                              }`}
                            >
                              {completionRate(entry)}%
                            </span>
                          </div>
                        )}
                      </div>
                      {entry ? (
                        <div className="space-y-1">
                          {[1, 2, 3].map((n) => {
                            const task = entry[`task_${n}` as keyof HistoryEntry] as string | null
                            const done = entry[`task_${n}_done` as keyof HistoryEntry] as boolean
                            if (!task) return null
                            return (
                              <div key={n} className="flex items-center gap-2">
                                {done ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-green flex-shrink-0" />
                                ) : (
                                  <Circle className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
                                )}
                                <span
                                  className={`text-xs ${
                                    done ? 'text-zinc-500 line-through' : 'text-zinc-300'
                                  }`}
                                >
                                  {task}
                                </span>
                              </div>
                            )
                          })}
                          {entry.pomodoros_completed > 0 && (
                            <p className="text-xs text-zinc-500 mt-1">
                              🍅 {entry.pomodoros_completed} pomodoros
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-600 italic">No focus data</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
