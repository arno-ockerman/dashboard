'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import {
  BarChart2,
  ChevronDown,
  ChevronUp,
  Coins,
  RefreshCw,
  Sigma,
  Wallet,
} from 'lucide-react'

type Period = 'today' | 'week' | 'month' | 'all'
type SortKey = 'model' | 'provider' | 'calls' | 'totalTokens' | 'estimatedCostUsd' | 'share'

interface UsageRow {
  model: string
  provider: 'anthropic' | 'openai' | 'google'
  calls: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCostUsd: number
}

interface UsageResponse {
  summary: {
    totalCalls: number
    totalTokens: number
    totalCostUsd: number
    period: string
  }
  byModel: UsageRow[]
  byDay: Array<{
    date: string
    totalTokens: number
    totalCostUsd: number
  }>
}

const PERIOD_OPTIONS: Array<{ value: Period; label: string }> = [
  { value: 'today', label: 'Vandaag' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Maand' },
  { value: 'all', label: 'Alles' },
]

const PROVIDER_META = {
  anthropic: {
    label: 'Anthropic',
    chip: 'bg-orange-100 text-orange-800',
    dot: '#f97316',
  },
  openai: {
    label: 'OpenAI',
    chip: 'bg-emerald-100 text-emerald-800',
    dot: '#16a34a',
  },
  google: {
    label: 'Google',
    chip: 'bg-sky-100 text-sky-800',
    dot: '#0284c7',
  },
} as const

const SORT_LABELS: Record<SortKey, string> = {
  model: 'Model',
  provider: 'Provider',
  calls: 'Calls',
  totalTokens: 'Tokens',
  estimatedCostUsd: 'Est. Kost',
  share: '% van totaal',
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value)
}

function formatCompact(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: value >= 1_000_000 ? 1 : 0,
  }).format(value)
}

function buildConicGradient(rows: Array<{ color: string; percent: number }>) {
  if (rows.length === 0) {
    return '#f3f4f6'
  }

  let current = 0
  const segments = rows.map((row) => {
    const start = current
    const end = current + row.percent
    current = end
    return `${row.color} ${start}% ${end}%`
  })

  return `conic-gradient(${segments.join(', ')})`
}

export default function UsagePage() {
  const [period, setPeriod] = useState<Period>('all')
  const [data, setData] = useState<UsageResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('estimatedCostUsd')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  async function fetchUsage(nextPeriod: Period, manual = false) {
    if (manual) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError(null)

    try {
      const response = await fetch(`/api/usage?period=${nextPeriod}`, { cache: 'no-store' })
      const json = await response.json()

      if (!response.ok) {
        throw new Error(json.error || 'Failed to load usage data')
      }

      setData(json)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to load usage data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchUsage(period)
  }, [period])

  function handleSort(nextSortKey: SortKey) {
    if (sortKey === nextSortKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortKey(nextSortKey)
    setSortDirection(nextSortKey === 'model' || nextSortKey === 'provider' ? 'asc' : 'desc')
  }

  const totalCost = data?.summary.totalCostUsd ?? 0
  const totalCalls = data?.summary.totalCalls ?? 0
  const totalTokens = data?.summary.totalTokens ?? 0
  const averageCostPerCall = totalCalls > 0 ? totalCost / totalCalls : 0

  const sortedRows = [...(data?.byModel ?? [])].sort((left, right) => {
    const leftShare = totalCost > 0 ? left.estimatedCostUsd / totalCost : 0
    const rightShare = totalCost > 0 ? right.estimatedCostUsd / totalCost : 0

    const leftValue =
      sortKey === 'share'
        ? leftShare
        : sortKey === 'provider'
          ? PROVIDER_META[left.provider].label
          : left[sortKey]

    const rightValue =
      sortKey === 'share'
        ? rightShare
        : sortKey === 'provider'
          ? PROVIDER_META[right.provider].label
          : right[sortKey]

    if (typeof leftValue === 'string' && typeof rightValue === 'string') {
      const comparison = leftValue.localeCompare(rightValue)
      return sortDirection === 'asc' ? comparison : comparison * -1
    }

    const comparison = Number(leftValue) - Number(rightValue)
    return sortDirection === 'asc' ? comparison : comparison * -1
  })

  const topTokenRows = [...(data?.byModel ?? [])]
    .sort((left, right) => right.totalTokens - left.totalTokens)
    .slice(0, 5)

  const providerTotals = Object.entries(PROVIDER_META)
    .map(([provider, meta]) => {
      const cost = (data?.byModel ?? [])
        .filter((row) => row.provider === provider)
        .reduce((sum, row) => sum + row.estimatedCostUsd, 0)

      return {
        provider,
        label: meta.label,
        color: meta.dot,
        cost,
        percent: totalCost > 0 ? (cost / totalCost) * 100 : 0,
      }
    })
    .filter((entry) => entry.cost > 0)
    .sort((left, right) => right.cost - left.cost)

  const maxDayTokens = data?.byDay.reduce((max, row) => Math.max(max, row.totalTokens), 0) ?? 0
  const latestDays = (data?.byDay ?? []).slice(-7)

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-brand-burgundy/15 bg-gradient-to-br from-white via-white to-[#f7efee] p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-burgundy/70"
              style={{ color: '#620E06' }}
            >
              Intelligence
            </p>
            <h1 className="mt-2 text-3xl font-bold text-zinc-950 lg:text-4xl">LLM Usage &amp; Costs</h1>
            <p className="mt-2 text-sm text-zinc-600">
              Live overzicht van tokenverbruik, geschatte kosten en modelverdeling over {data?.summary.period ?? 'all time'}.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex rounded-2xl border border-zinc-200 bg-white p-1 shadow-sm">
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setPeriod(option.value)}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                    period === option.value
                      ? 'bg-brand-burgundy text-white'
                      : 'text-zinc-600 hover:bg-zinc-100'
                  }`}
                  style={period === option.value ? { backgroundColor: '#620E06' } : undefined}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => fetchUsage(period, true)}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Totale kost',
            value: formatCurrency(totalCost),
            hint: data?.summary.period ?? 'all time',
            icon: Wallet,
          },
          {
            label: 'Totaal calls',
            value: formatNumber(totalCalls),
            hint: 'all providers',
            icon: BarChart2,
          },
          {
            label: 'Totaal tokens',
            value: formatCompact(totalTokens),
            hint: `${formatNumber(totalTokens)} tokens`,
            icon: Sigma,
          },
          {
            label: 'Gem. kost per call',
            value: formatCurrency(averageCostPerCall),
            hint: totalCalls > 0 ? `${formatCurrency(totalCost)} / ${formatNumber(totalCalls)}` : 'no calls yet',
            icon: Coins,
          },
        ].map((card) => {
          const Icon = card.icon

          return (
            <div
              key={card.label}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-500">{card.label}</p>
                <div
                  className="rounded-xl p-2 text-white"
                  style={{ backgroundColor: '#620E06' }}
                >
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-4 text-3xl font-bold text-zinc-950">{card.value}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-zinc-400">{card.hint}</p>
            </div>
          )
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-zinc-950">Per-Model Breakdown</h2>
              <p className="text-sm text-zinc-500">Sorteer op kosten, tokens, calls of modelnaam.</p>
            </div>
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-400">
              {formatNumber(sortedRows.length)} modellen
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500">
                  {(['model', 'provider', 'calls', 'totalTokens', 'estimatedCostUsd', 'share'] as SortKey[]).map((column) => (
                    <th key={column} className="px-3 py-3 font-medium">
                      <button
                        onClick={() => handleSort(column)}
                        className="inline-flex items-center gap-1 whitespace-nowrap"
                      >
                        {SORT_LABELS[column]}
                        {sortKey === column ? (
                          sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        ) : null}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <tr key={index} className="border-b border-zinc-100">
                      <td className="px-3 py-4" colSpan={6}>
                        <div className="h-6 animate-pulse rounded-lg bg-zinc-100" />
                      </td>
                    </tr>
                  ))
                ) : sortedRows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-8 text-center text-zinc-500" colSpan={6}>
                      Geen usage data gevonden voor deze periode.
                    </td>
                  </tr>
                ) : (
                  sortedRows.map((row, index) => {
                    const share = totalCost > 0 ? (row.estimatedCostUsd / totalCost) * 100 : 0
                    const providerMeta = PROVIDER_META[row.provider]

                    return (
                      <tr
                        key={row.model}
                        className={`${index % 2 === 0 ? 'bg-white' : 'bg-zinc-50'} border-b border-zinc-100 transition-colors hover:bg-[#f8f2f1]`}
                      >
                        <td className="px-3 py-4 font-semibold text-zinc-950">{row.model}</td>
                        <td className="px-3 py-4">
                          <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${providerMeta.chip}`}>
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: providerMeta.dot }}
                            />
                            {providerMeta.label}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-zinc-700">{formatNumber(row.calls)}</td>
                        <td className="px-3 py-4 text-zinc-700">{formatCompact(row.totalTokens)}</td>
                        <td className="px-3 py-4 font-semibold text-zinc-950">{formatCurrency(row.estimatedCostUsd)}</td>
                        <td className="px-3 py-4 text-zinc-700">{share.toFixed(1)}%</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-zinc-950">Token Usage Chart</h2>
                <p className="text-sm text-zinc-500">Top 5 modellen op tokenvolume.</p>
              </div>
              <BarChart2 className="h-5 w-5" style={{ color: '#620E06' }} />
            </div>

            <div className="mt-5 space-y-4">
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="space-y-2">
                    <div className="h-4 w-24 animate-pulse rounded bg-zinc-100" />
                    <div className="h-3 animate-pulse rounded-full bg-zinc-100" />
                  </div>
                ))
              ) : topTokenRows.length === 0 ? (
                <p className="text-sm text-zinc-500">Nog geen tokendata beschikbaar.</p>
              ) : (
                topTokenRows.map((row) => {
                  const maxTokens = topTokenRows[0]?.totalTokens || 1
                  const width = (row.totalTokens / maxTokens) * 100

                  return (
                    <div key={row.model}>
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-medium text-zinc-800">{row.model}</span>
                        <span className="text-xs text-zinc-500">{formatCompact(row.totalTokens)}</span>
                      </div>
                      <div className="h-3 rounded-full bg-zinc-100">
                        <div
                          className="h-3 rounded-full"
                          style={{
                            width: `${width}%`,
                            background: 'linear-gradient(90deg, #620E06, #a91f0f)',
                          }}
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-zinc-950">Cost Breakdown</h2>
            <p className="mt-1 text-sm text-zinc-500">Kostenverdeling per provider.</p>

            <div className="mt-5 flex flex-col items-center gap-5 sm:flex-row sm:items-center">
              <div
                className="relative h-36 w-36 rounded-full"
                style={{ background: buildConicGradient(providerTotals) }}
              >
                <div className="absolute inset-5 rounded-full bg-white" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Total</p>
                    <p className="text-lg font-bold text-zinc-950">{formatCurrency(totalCost)}</p>
                  </div>
                </div>
              </div>

              <div className="w-full space-y-3">
                {providerTotals.length === 0 ? (
                  <p className="text-sm text-zinc-500">Nog geen kosten geregistreerd.</p>
                ) : (
                  providerTotals.map((entry) => (
                    <div key={entry.provider} className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="h-3 w-3 rounded-sm"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-sm font-medium text-zinc-800">{entry.label}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-zinc-950">{formatCurrency(entry.cost)}</p>
                        <p className="text-xs text-zinc-500">{entry.percent.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-zinc-950">Recent Daily Usage</h2>
            <p className="mt-1 text-sm text-zinc-500">Laatste 7 dagen uit de geselecteerde periode.</p>

            <div className="mt-5 space-y-3">
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-12 animate-pulse rounded-xl bg-zinc-100" />
                ))
              ) : latestDays.length === 0 ? (
                <p className="text-sm text-zinc-500">Geen dagelijkse data beschikbaar.</p>
              ) : (
                latestDays.map((day) => {
                  const width = maxDayTokens > 0 ? (day.totalTokens / maxDayTokens) * 100 : 0

                  return (
                    <div key={day.date}>
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-zinc-800">{day.date}</span>
                        <span className="text-xs text-zinc-500">
                          {formatCompact(day.totalTokens)} • {formatCurrency(day.totalCostUsd)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-100">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${width}%`,
                            backgroundColor: '#620E06',
                          }}
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
