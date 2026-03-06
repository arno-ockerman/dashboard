'use client'

import { useEffect, useState } from 'react'
import {
  Heart, Activity, Scale, Zap, TrendingUp, TrendingDown,
  Minus, Moon, Footprints, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

interface HealthSnapshot {
  id: string
  date: string
  weight_kg: number | null
  body_fat_pct: number | null
  lean_mass_kg: number | null
  fat_mass_kg: number | null
  hrv_ms: number | null
  resting_hr: number | null
  readiness_score: number | null
  recovery_score: number | null
  steps: number | null
  active_calories: number | null
  exercise_min: number | null
  sleep_hours: number | null
  sleep_quality: string | null
  sleep_awakenings: number | null
  notes: string | null
}

type TrendDir = 'up' | 'down' | 'neutral'

interface HealthData {
  snapshots: HealthSnapshot[]
  latest: HealthSnapshot | null
  trends: Record<string, TrendDir>
  averages: Record<string, number | null>
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readinessColor(score: number | null): string {
  if (score == null) return '#52525b'
  if (score >= 80) return '#22c55e'   // green
  if (score >= 60) return '#f59e0b'   // amber
  if (score >= 40) return '#f97316'   // orange
  return '#ef4444'                    // red
}

function readinessLabel(score: number | null): string {
  if (score == null) return 'No data'
  if (score >= 80) return 'Optimal 🔥'
  if (score >= 60) return 'Good ✅'
  if (score >= 40) return 'Moderate 🟠'
  return 'Low 🔴'
}

function TrendIcon({ dir, higherBetter = true }: { dir: TrendDir; higherBetter?: boolean }) {
  if (dir === 'neutral') return <Minus className="w-3 h-3 text-zinc-500" />
  const isGood = (dir === 'up') === higherBetter
  if (dir === 'up') return <TrendingUp className={`w-3 h-3 ${isGood ? 'text-green-400' : 'text-red-400'}`} />
  return <TrendingDown className={`w-3 h-3 ${isGood ? 'text-green-400' : 'text-red-400'}`} />
}

// SVG Sparkline — no external deps
function Sparkline({
  data,
  color = '#620E06',
  height = 36,
  width = 80,
}: {
  data: (number | null)[]
  color?: string
  height?: number
  width?: number
}) {
  const vals = data.filter((v): v is number => v != null)
  if (vals.length < 2) return <div style={{ width, height }} className="opacity-20 bg-zinc-800 rounded" />

  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1

  const points = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Fill area */}
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={color}
        opacity={0.12}
      />
    </svg>
  )
}

// Circular readiness gauge
function ReadinessRing({ score }: { score: number | null }) {
  const size = 120
  const stroke = 10
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const pct = score != null ? Math.min(Math.max(score, 0), 100) / 100 : 0
  const dash = pct * circ
  const color = readinessColor(score)

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="#27272a" strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-white leading-none">
          {score != null ? score : '—'}
        </span>
        <span className="text-xs text-zinc-400 mt-0.5">/ 100</span>
      </div>
    </div>
  )
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  label,
  value,
  unit,
  trend,
  higherBetter,
  avg,
  color = '#620E06',
  sparkData,
}: {
  icon: React.ElementType
  label: string
  value: number | null
  unit: string
  trend: TrendDir
  higherBetter?: boolean
  avg: number | null
  color?: string
  sparkData: (number | null)[]
}) {
  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}22` }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <span className="text-xs text-zinc-400 font-medium">{label}</span>
        </div>
        <TrendIcon dir={trend} higherBetter={higherBetter} />
      </div>

      <div className="flex items-end justify-between">
        <div>
          <span className="text-2xl font-bold text-white leading-none">
            {value != null ? value : '—'}
          </span>
          <span className="text-sm text-zinc-500 ml-1">{unit}</span>
          {avg != null && (
            <p className="text-xs text-zinc-600 mt-1">avg {avg} {unit}</p>
          )}
        </div>
        <Sparkline data={sparkData} color={color} />
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const DAYS_OPTIONS = [7, 14, 30]

export default function HealthPage() {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(14)
  const [showHistory, setShowHistory] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async (d = days) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/health?days=${d}`)
      const json = await res.json()
      setData(json)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData(days) }, [days])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData(days)
    setRefreshing(false)
  }

  const latest = data?.latest
  const snapshots = data?.snapshots ?? []
  const trends = data?.trends ?? {}
  const averages = data?.averages ?? {}

  // Extract sparkline series (oldest → newest)
  const series = [...snapshots].reverse()
  const spark = (field: keyof HealthSnapshot) => series.map((s) => s[field] as number | null)

  // Body fat % target — goal: 12%
  const bfGoal = 12
  const bfProgress = latest?.body_fat_pct != null
    ? Math.max(0, Math.min(100, ((latest.body_fat_pct - bfGoal) / (25 - bfGoal)) * 100))
    : null

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-3xl text-white tracking-widest uppercase"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            Health & Recovery
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Apple Health · Synced via iOS Shortcut
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            {DAYS_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                  days === d
                    ? 'bg-brand-burgundy text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-secondary"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <div key={i} className="card skeleton h-28" />)}
        </div>
      ) : !latest ? (
        <div className="card text-center py-16">
          <Heart className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-400 text-lg font-medium">Geen health data gevonden</p>
          <p className="text-zinc-600 text-sm mt-1">
            Run the SQL migration en sync je Apple Health data via de iOS Shortcut.
          </p>
        </div>
      ) : (
        <>
          {/* Hero row: Readiness + summary */}
          <div className="grid lg:grid-cols-3 gap-4 mb-6">
            {/* Readiness ring card */}
            <div className="card flex flex-col items-center justify-center gap-3 py-6">
              <p className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">
                Readiness Score
              </p>
              <ReadinessRing score={latest.readiness_score} />
              <p
                className="text-sm font-semibold"
                style={{ color: readinessColor(latest.readiness_score) }}
              >
                {readinessLabel(latest.readiness_score)}
              </p>
              <p className="text-xs text-zinc-600">
                {new Date(latest.date).toLocaleDateString('nl-BE', {
                  weekday: 'long', day: 'numeric', month: 'long',
                })}
              </p>
            </div>

            {/* Body composition summary */}
            <div className="card flex flex-col justify-between">
              <p className="text-xs text-zinc-400 uppercase tracking-widest font-semibold mb-4">
                Body Composition
              </p>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-sm">Gewicht</span>
                  <span className="text-white font-bold">
                    {latest.weight_kg != null ? `${latest.weight_kg} kg` : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-sm">Vetmassa</span>
                  <span className="text-white font-bold">
                    {latest.body_fat_pct != null ? `${latest.body_fat_pct}%` : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-sm">Spiermassa</span>
                  <span className="text-white font-bold">
                    {latest.lean_mass_kg != null ? `${latest.lean_mass_kg} kg` : '—'}
                  </span>
                </div>
              </div>

              {/* Body fat progress bar */}
              {bfProgress != null && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-zinc-500 mb-1">
                    <span>Body fat naar doel (12%)</span>
                    <span>{latest.body_fat_pct}% → 12%</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${100 - bfProgress}%`,
                        background: '#425C59',
                      }}
                    />
                  </div>
                  <p className="text-xs text-zinc-600 mt-1">
                    {latest.body_fat_pct != null && bfGoal != null
                      ? `Nog ${(latest.body_fat_pct - bfGoal).toFixed(1)}% vetmassa te verliezen`
                      : ''}
                  </p>
                </div>
              )}
            </div>

            {/* Recovery stats */}
            <div className="card flex flex-col justify-between">
              <p className="text-xs text-zinc-400 uppercase tracking-widest font-semibold mb-4">
                Recovery
              </p>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-sm flex items-center gap-1">
                    <Heart className="w-3 h-3 text-red-400" /> HRV
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-white font-bold">
                      {latest.hrv_ms != null ? `${latest.hrv_ms} ms` : '—'}
                    </span>
                    <TrendIcon dir={trends.hrv ?? 'neutral'} higherBetter />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-sm flex items-center gap-1">
                    <Activity className="w-3 h-3 text-blue-400" /> Rust-HR
                  </span>
                  <span className="text-white font-bold">
                    {latest.resting_hr != null ? `${latest.resting_hr} bpm` : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-sm flex items-center gap-1">
                    <Moon className="w-3 h-3 text-purple-400" /> Slaap
                  </span>
                  <span className="text-white font-bold">
                    {latest.sleep_hours != null ? `${latest.sleep_hours}u` : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-sm flex items-center gap-1">
                    <Footprints className="w-3 h-3 text-amber-400" /> Stappen
                  </span>
                  <span className="text-white font-bold">
                    {latest.steps != null
                      ? latest.steps >= 1000
                        ? `${(latest.steps / 1000).toFixed(1)}k`
                        : latest.steps
                      : '—'}
                  </span>
                </div>
              </div>
              {latest.notes && (
                <p className="text-xs text-zinc-600 mt-3 italic border-t border-zinc-800 pt-3">
                  {latest.notes}
                </p>
              )}
            </div>
          </div>

          {/* Metric trend cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard
              icon={Scale}
              label="Gewicht"
              value={latest.weight_kg}
              unit="kg"
              trend={trends.weight ?? 'neutral'}
              higherBetter={false}
              avg={averages.weight}
              color="#620E06"
              sparkData={spark('weight_kg')}
            />
            <MetricCard
              icon={Zap}
              label="Vetpercentage"
              value={latest.body_fat_pct}
              unit="%"
              trend={trends.body_fat ?? 'neutral'}
              higherBetter={false}
              avg={averages.body_fat}
              color="#f97316"
              sparkData={spark('body_fat_pct')}
            />
            <MetricCard
              icon={TrendingUp}
              label="Spiermassa"
              value={latest.lean_mass_kg}
              unit="kg"
              trend={trends.lean_mass ?? 'neutral'}
              higherBetter
              avg={averages.lean_mass}
              color="#425C59"
              sparkData={spark('lean_mass_kg')}
            />
            <MetricCard
              icon={Heart}
              label="HRV"
              value={latest.hrv_ms}
              unit="ms"
              trend={trends.hrv ?? 'neutral'}
              higherBetter
              avg={averages.hrv}
              color="#a855f7"
              sparkData={spark('hrv_ms')}
            />
          </div>

          {/* History table (collapsible) */}
          {snapshots.length > 1 && (
            <div className="card">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center justify-between w-full text-left"
              >
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-brand-burgundy" />
                  Historiek
                  <span className="text-sm font-normal text-zinc-500">
                    {snapshots.length} metingen
                  </span>
                </h2>
                {showHistory ? (
                  <ChevronUp className="w-4 h-4 text-zinc-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-zinc-500" />
                )}
              </button>

              {showHistory && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left text-zinc-500 font-medium pb-2 pr-4">Datum</th>
                        <th className="text-right text-zinc-500 font-medium pb-2 px-3">Gewicht</th>
                        <th className="text-right text-zinc-500 font-medium pb-2 px-3">Vet%</th>
                        <th className="text-right text-zinc-500 font-medium pb-2 px-3">Spier</th>
                        <th className="text-right text-zinc-500 font-medium pb-2 px-3">HRV</th>
                        <th className="text-right text-zinc-500 font-medium pb-2 px-3">Readiness</th>
                        <th className="text-right text-zinc-500 font-medium pb-2 pl-3">Stappen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshots.map((s, i) => (
                        <tr
                          key={s.id}
                          className={`border-b border-zinc-800/40 transition-colors hover:bg-zinc-900/40 ${
                            i === 0 ? 'bg-brand-burgundy/5' : ''
                          }`}
                        >
                          <td className="py-2 pr-4 text-zinc-300 whitespace-nowrap">
                            {new Date(s.date).toLocaleDateString('nl-BE', {
                              weekday: 'short', day: 'numeric', month: 'short',
                            })}
                            {i === 0 && (
                              <span className="ml-2 text-xs text-brand-burgundy font-medium">
                                (latest)
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right text-zinc-300 tabular-nums">
                            {s.weight_kg != null ? `${s.weight_kg}` : '—'}
                          </td>
                          <td className="py-2 px-3 text-right text-zinc-300 tabular-nums">
                            {s.body_fat_pct != null ? `${s.body_fat_pct}%` : '—'}
                          </td>
                          <td className="py-2 px-3 text-right text-zinc-300 tabular-nums">
                            {s.lean_mass_kg != null ? `${s.lean_mass_kg}` : '—'}
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums">
                            <span
                              style={{ color: s.hrv_ms != null && s.hrv_ms >= 50 ? '#22c55e' : s.hrv_ms != null && s.hrv_ms >= 35 ? '#f59e0b' : '#ef4444' }}
                            >
                              {s.hrv_ms != null ? `${s.hrv_ms}` : '—'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right tabular-nums">
                            <span style={{ color: readinessColor(s.readiness_score) }}>
                              {s.readiness_score != null ? s.readiness_score : '—'}
                            </span>
                          </td>
                          <td className="py-2 pl-3 text-right text-zinc-300 tabular-nums">
                            {s.steps != null
                              ? s.steps >= 1000
                                ? `${(s.steps / 1000).toFixed(1)}k`
                                : s.steps
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
