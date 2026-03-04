'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import {
  addMonths,
  format,
  parse,
  startOfMonth,
  subMonths,
} from 'date-fns'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ProductCategory, Sale, SalesStats } from '@/types'

const CATEGORY_ORDER: ProductCategory[] = [
  'shakes',
  'supplements',
  'tea',
  'aloe',
  'skin',
  'challenge',
  'other',
]

const CATEGORY_META: Record<ProductCategory, {
  label: string
  emoji: string
  badge: string
  accent: string
}> = {
  shakes: {
    label: 'Shakes',
    emoji: '🥤',
    badge: 'bg-brand-green/20 text-emerald-300 border border-brand-green/30',
    accent: '#425C59',
  },
  supplements: {
    label: 'Supplements',
    emoji: '💊',
    badge: 'bg-brand-burgundy/20 text-red-300 border border-brand-burgundy/30',
    accent: '#620E06',
  },
  tea: {
    label: 'Tea',
    emoji: '🍵',
    badge: 'bg-amber-900/20 text-amber-300 border border-brand-amber/20',
    accent: '#D5CBBA',
  },
  aloe: {
    label: 'Aloe',
    emoji: '🌿',
    badge: 'bg-emerald-900/20 text-emerald-300 border border-emerald-700/30',
    accent: '#5d9b87',
  },
  skin: {
    label: 'Skin',
    emoji: '✨',
    badge: 'bg-zinc-800 text-zinc-200 border border-zinc-700',
    accent: '#8b7fd1',
  },
  challenge: {
    label: 'Challenge',
    emoji: '🎯',
    badge: 'bg-sky-900/20 text-sky-300 border border-sky-700/30',
    accent: '#3b82f6',
  },
  other: {
    label: 'Other',
    emoji: '📦',
    badge: 'bg-zinc-800 text-zinc-300 border border-zinc-700',
    accent: '#71717a',
  },
}

interface SaleFormState {
  date: string
  client_name: string
  product_category: ProductCategory
  product_name: string
  amount: string
  notes: string
}

interface MonthlyRevenuePoint {
  key: string
  label: string
  total: number
}

const defaultFormState = (): SaleFormState => ({
  date: format(new Date(), 'yyyy-MM-dd'),
  client_name: '',
  product_category: 'shakes',
  product_name: '',
  amount: '',
  notes: '',
})

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-BE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function getMonthKey(date: Date) {
  return format(date, 'yyyy-MM')
}

export default function SalesPage() {
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'))
  const [stats, setStats] = useState<SalesStats | null>(null)
  const [sales, setSales] = useState<Sale[]>([])
  const [chartSales, setChartSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [form, setForm] = useState<SaleFormState>(defaultFormState)

  const fetchData = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError(null)

    try {
      const [statsRes, salesRes, chartRes] = await Promise.all([
        fetch('/api/sales/stats', { cache: 'no-store' }),
        fetch(`/api/sales?month=${selectedMonth}&limit=200`, { cache: 'no-store' }),
        fetch('/api/sales?limit=1000', { cache: 'no-store' }),
      ])

      const [statsJson, salesJson, chartJson] = await Promise.all([
        statsRes.json(),
        salesRes.json(),
        chartRes.json(),
      ])

      if (!statsRes.ok) {
        throw new Error(statsJson.error || 'Failed to load sales stats')
      }
      if (!salesRes.ok) {
        throw new Error(salesJson.error || 'Failed to load sales history')
      }
      if (!chartRes.ok) {
        throw new Error(chartJson.error || 'Failed to load sales chart')
      }

      setStats(statsJson)
      setSales(Array.isArray(salesJson) ? salesJson : [])
      setChartSales(Array.isArray(chartJson) ? chartJson : [])
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to load sales data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedMonth])

  const chartData = useMemo<MonthlyRevenuePoint[]>(() => {
    const months = Array.from({ length: 6 }, (_, index) => {
      const monthDate = startOfMonth(subMonths(new Date(), 5 - index))
      return {
        key: getMonthKey(monthDate),
        label: format(monthDate, 'MMM'),
        total: 0,
      }
    })

    const totals = new Map(months.map((month) => [month.key, month]))

    for (const sale of chartSales) {
      const parsed = parse(`${sale.date}-12:00:00`, 'yyyy-MM-dd-HH:mm:ss', new Date())
      const key = getMonthKey(parsed)
      const entry = totals.get(key)
      if (entry) {
        entry.total += Number(sale.amount) || 0
      }
    }

    return months
  }, [chartSales])

  const categoryRows = useMemo(() => {
    const totalRevenue = stats?.by_category.reduce((sum, entry) => sum + entry.total, 0) || 0

    return CATEGORY_ORDER.map((category) => {
      const entry = stats?.by_category.find((item) => item.category === category)
      const total = entry?.total || 0
      const count = entry?.count || 0
      const percent = totalRevenue > 0 ? (total / totalRevenue) * 100 : 0

      return {
        category,
        total,
        count,
        percent,
      }
    })
  }, [stats])

  const submitSale = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setFormError(null)

    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: Number.parseFloat(form.amount),
        }),
      })

      const json = await response.json()
      if (!response.ok) {
        throw new Error(json.error || 'Failed to save sale')
      }

      setForm(defaultFormState())
      setShowForm(false)
      await fetchData(true)
    } catch (caughtError) {
      setFormError(caughtError instanceof Error ? caughtError.message : 'Failed to save sale')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteSale = async (saleId: string) => {
    if (!confirm('Delete this sale?')) {
      return
    }

    setDeletingId(saleId)
    setError(null)

    try {
      const response = await fetch(`/api/sales/${saleId}`, { method: 'DELETE' })
      const json = await response.json()

      if (!response.ok) {
        throw new Error(json.error || 'Failed to delete sale')
      }

      await fetchData(true)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to delete sale')
    } finally {
      setDeletingId(null)
    }
  }

  const selectedMonthDate = parse(`${selectedMonth}-01`, 'yyyy-MM-dd', new Date())
  const currentMonthDate = new Date()
  const growthPositive = (stats?.growth_pct || 0) >= 0
  const GrowthIcon = growthPositive ? TrendingUp : TrendingDown

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div>
          <h1
            className="text-4xl sm:text-5xl text-white tracking-[0.14em] uppercase"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            Sales & Revenue
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Herbalife Distribution</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            className="btn-secondary"
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowForm((current) => !current)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            Log Sale
            <ChevronDown className={`w-4 h-4 transition-transform ${showForm ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="card skeleton h-28" />
            ))}
          </div>
          <div className="grid gap-6 xl:grid-cols-[1.5fr,1fr]">
            <div className="card skeleton h-80" />
            <div className="card skeleton h-80" />
          </div>
          <div className="card skeleton h-72" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
            <div className="card">
              <p className="text-zinc-400 text-sm">This Month Revenue</p>
              <p className="mt-3 text-3xl font-semibold text-emerald-300">
                {formatCurrency(stats?.this_month || 0)}
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                {format(currentMonthDate, 'MMMM yyyy')}
              </p>
            </div>

            <div className="card">
              <p className="text-zinc-400 text-sm">Last Month Revenue</p>
              <p className="mt-3 text-3xl font-semibold text-zinc-200">
                {formatCurrency(stats?.last_month || 0)}
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                {format(subMonths(currentMonthDate, 1), 'MMMM yyyy')}
              </p>
            </div>

            <div className="card">
              <p className="text-zinc-400 text-sm">Growth %</p>
              <div className={`mt-3 flex items-center gap-2 text-3xl font-semibold ${
                growthPositive ? 'text-emerald-300' : 'text-red-300'
              }`}>
                <GrowthIcon className="w-7 h-7" />
                <span>{(stats?.growth_pct || 0).toFixed(1)}%</span>
              </div>
              <p className="mt-2 text-xs text-zinc-500">vs previous month</p>
            </div>

            <div className="card">
              <p className="text-zinc-400 text-sm">Total Sales Count</p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {stats?.total_sales || 0}
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                Avg sale {formatCurrency(stats?.avg_sale || 0)}
              </p>
            </div>
          </div>

          {showForm && (
            <div className="card mb-6 border-brand-burgundy/30 bg-gradient-to-br from-brand-burgundy/10 to-zinc-900">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-semibold text-white">Quick Add Sale</h2>
                  <p className="text-sm text-zinc-500">Log product revenue in seconds.</p>
                </div>
                <button
                  onClick={() => setShowForm(false)}
                  className="btn-ghost px-3"
                >
                  Close
                </button>
              </div>

              <form onSubmit={submitSale} className="grid gap-4 lg:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-medium uppercase tracking-widest text-zinc-500">Date</span>
                  <input
                    type="date"
                    className="input"
                    value={form.date}
                    onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-medium uppercase tracking-widest text-zinc-500">Client Name</span>
                  <input
                    type="text"
                    className="input"
                    placeholder="Optional"
                    value={form.client_name}
                    onChange={(event) => setForm((current) => ({ ...current, client_name: event.target.value }))}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-medium uppercase tracking-widest text-zinc-500">Product Category</span>
                  <select
                    className="select"
                    value={form.product_category}
                    onChange={(event) => setForm((current) => ({
                      ...current,
                      product_category: event.target.value as ProductCategory,
                    }))}
                  >
                    {CATEGORY_ORDER.map((category) => (
                      <option key={category} value={category}>
                        {CATEGORY_META[category].emoji} {CATEGORY_META[category].label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-medium uppercase tracking-widest text-zinc-500">Product Name</span>
                  <input
                    type="text"
                    className="input"
                    placeholder="Optional"
                    value={form.product_name}
                    onChange={(event) => setForm((current) => ({ ...current, product_name: event.target.value }))}
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-medium uppercase tracking-widest text-zinc-500">Amount (€)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                    required
                  />
                </label>

                <label className="block lg:col-span-2">
                  <span className="mb-2 block text-xs font-medium uppercase tracking-widest text-zinc-500">Notes</span>
                  <textarea
                    className="input min-h-24 resize-y"
                    placeholder="Optional notes"
                    value={form.notes}
                    onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  />
                </label>

                {formError && (
                  <div className="lg:col-span-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {formError}
                  </div>
                )}

                <div className="lg:col-span-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setForm(defaultFormState())
                      setFormError(null)
                    }}
                  >
                    Reset
                  </button>
                  <button type="submit" className="btn-primary" disabled={submitting}>
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Save Sale
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[1.5fr,1fr] mb-6">
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-white">Revenue Trend</h2>
                  <p className="text-sm text-zinc-500">Last 6 months of logged revenue</p>
                </div>
              </div>

              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" />
                    <YAxis tickFormatter={(value) => `€${value}`} width={56} />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      formatter={(value) => formatCurrency(Number(value) || 0)}
                      contentStyle={{
                        backgroundColor: '#18181b',
                        border: '1px solid #27272a',
                        borderRadius: 12,
                        color: '#fff',
                      }}
                    />
                    <Bar
                      dataKey="total"
                      fill="#620E06"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-white">Product Category Breakdown</h2>
                <p className="text-sm text-zinc-500">Share of total revenue</p>
              </div>

              <div className="space-y-4">
                {categoryRows.map(({ category, total, count, percent }) => (
                  <div key={category}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">
                          {CATEGORY_META[category].emoji} {CATEGORY_META[category].label}
                        </p>
                        <p className="text-xs text-zinc-500">{count} sale{count === 1 ? '' : 's'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-white">{formatCurrency(total)}</p>
                        <p className="text-xs text-zinc-500">{percent.toFixed(0)}%</p>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: CATEGORY_META[category].accent,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex flex-col gap-4 mb-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Sales History</h2>
                <p className="text-sm text-zinc-500">Logged sales for the selected month</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedMonth(format(addMonths(selectedMonthDate, -1), 'yyyy-MM'))}
                  className="btn-secondary px-3"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="rounded-lg border border-zinc-800 bg-zinc-800/70 px-4 py-2 text-sm font-medium text-white min-w-40 text-center">
                  {format(selectedMonthDate, 'MMMM yyyy')}
                </div>
                <button
                  onClick={() => setSelectedMonth(format(addMonths(selectedMonthDate, 1), 'yyyy-MM'))}
                  className="btn-secondary px-3"
                  aria-label="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {sales.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 px-6 py-16 text-center">
                <p className="text-lg font-medium text-white">No sales logged for {format(selectedMonthDate, 'MMMM yyyy')} yet.</p>
                <p className="text-sm text-zinc-500 mt-2 mb-6">Start building momentum by logging the first order.</p>
                <button onClick={() => setShowForm(true)} className="btn-primary mx-auto">
                  <Plus className="w-4 h-4" />
                  Log your first sale
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-widest text-zinc-500">
                      <th className="pb-3 pr-4 font-medium">Date</th>
                      <th className="pb-3 pr-4 font-medium">Client</th>
                      <th className="pb-3 pr-4 font-medium">Category</th>
                      <th className="pb-3 pr-4 font-medium">Product</th>
                      <th className="pb-3 pr-4 font-medium">Amount</th>
                      <th className="pb-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((sale) => {
                      const category = CATEGORY_ORDER.includes(sale.product_category)
                        ? sale.product_category
                        : 'other'

                      return (
                        <tr
                          key={sale.id}
                          className="border-b border-zinc-900 transition-colors hover:bg-zinc-800/40"
                        >
                          <td className="py-4 pr-4 text-zinc-300 whitespace-nowrap">
                            {format(parse(`${sale.date}-12:00:00`, 'yyyy-MM-dd-HH:mm:ss', new Date()), 'dd MMM yyyy')}
                          </td>
                          <td className="py-4 pr-4 text-white">
                            {sale.client_name || <span className="text-zinc-500">Walk-in / direct</span>}
                          </td>
                          <td className="py-4 pr-4">
                            <span className={`badge ${CATEGORY_META[category].badge}`}>
                              {CATEGORY_META[category].emoji} {CATEGORY_META[category].label}
                            </span>
                          </td>
                          <td className="py-4 pr-4 text-zinc-300">
                            {sale.product_name || <span className="text-zinc-500">Not specified</span>}
                          </td>
                          <td className="py-4 pr-4 text-white font-semibold whitespace-nowrap">
                            {formatCurrency(Number(sale.amount) || 0)}
                          </td>
                          <td className="py-4 text-right">
                            <button
                              onClick={() => deleteSale(sale.id)}
                              className="inline-flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-500 transition-colors hover:border-red-500/40 hover:text-red-300"
                              disabled={deletingId === sale.id}
                              aria-label="Delete sale"
                            >
                              {deletingId === sale.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
