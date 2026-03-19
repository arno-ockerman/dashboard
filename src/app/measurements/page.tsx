'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  Ruler,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  Minus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import type { Measurement, MeasurementsListResponse } from '@/types'

// ─── Types ───────────────────────────────────────────────────────────────────

interface FormState {
  client_name: string
  date: string
  weight_kg: string
  body_fat_pct: string
  waist_cm: string
  hip_cm: string
  chest_cm: string
  notes: string
}

interface ProgressSummary {
  weight_lost: number | null
  waist_lost: number | null
  body_fat_change: number | null
  entries: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().split('T')[0]

function emptyForm(clientName = ''): FormState {
  return {
    client_name: clientName,
    date: today(),
    weight_kg: '',
    body_fat_pct: '',
    waist_cm: '',
    hip_cm: '',
    chest_cm: '',
    notes: '',
  }
}

function parseNum(val: string): number | null {
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('nl-BE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function delta(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null) return null
  return Math.round((current - previous) * 10) / 10
}

function computeProgress(measurements: Measurement[]): ProgressSummary {
  if (measurements.length === 0) return { weight_lost: null, waist_lost: null, body_fat_change: null, entries: 0 }

  const sorted = [...measurements].sort((a, b) => a.date.localeCompare(b.date))
  const first  = sorted[0]
  const latest = sorted[sorted.length - 1]

  return {
    weight_lost:    delta(latest.weight_kg,    first.weight_kg),
    waist_lost:     delta(latest.waist_cm,     first.waist_cm),
    body_fat_change: delta(latest.body_fat_pct, first.body_fat_pct),
    entries: sorted.length,
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: number | null
  unit: string
  invertPositive?: boolean  // true = lower is better
}

function StatCard({ label, value, unit, invertPositive = false }: StatCardProps) {
  const isPositive = value != null && (invertPositive ? value < 0 : value > 0)
  const isNegative = value != null && (invertPositive ? value > 0 : value < 0)

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-1">
      <span className="text-zinc-500 text-xs uppercase tracking-widest">{label}</span>
      {value == null ? (
        <span className="text-zinc-600 text-lg font-bold">—</span>
      ) : (
        <div className="flex items-center gap-1.5">
          {isPositive && <TrendingUp className="w-4 h-4 text-green-400" />}
          {isNegative && <TrendingDown className="w-4 h-4 text-red-400" />}
          {value === 0 && <Minus className="w-4 h-4 text-zinc-500" />}
          <span
            className={`text-lg font-bold ${
              isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-zinc-400'
            }`}
          >
            {value > 0 ? '+' : ''}{value} {unit}
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 15

export default function MeasurementsPage() {
  const [measurements, setMeasurements]   = useState<Measurement[]>([])
  const [allClients, setAllClients]       = useState<string[]>([])
  const [selectedClient, setSelectedClient] = useState<string>('')
  const [total, setTotal]                 = useState(0)
  const [page, setPage]                   = useState(0)
  const [loading, setLoading]             = useState(false)
  const [saving, setSaving]               = useState(false)
  const [showForm, setShowForm]           = useState(false)
  const [form, setForm]                   = useState<FormState>(emptyForm())
  const [error, setError]                 = useState<string | null>(null)

  // Chart data (all entries for selected client, sorted asc)
  const [chartData, setChartData] = useState<Measurement[]>([])

  // ─── Data fetching ───────────────────────────────────────────────────────

  const fetchMeasurements = useCallback(async (client: string, pageNum: number) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        limit:  PAGE_SIZE.toString(),
        offset: (pageNum * PAGE_SIZE).toString(),
      })
      if (client) params.set('clientName', client)

      const res = await fetch(`/api/measurements?${params}`)
      if (!res.ok) throw new Error('Failed to fetch measurements')
      const data: MeasurementsListResponse = await res.json()

      setMeasurements(data.measurements)
      setTotal(data.total)
      setAllClients(data.clients)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch chart data (all entries for selected client, no pagination)
  const fetchChartData = useCallback(async (client: string) => {
    if (!client) { setChartData([]); return }
    try {
      const params = new URLSearchParams({ clientName: client, limit: '100', offset: '0' })
      const res  = await fetch(`/api/measurements?${params}`)
      if (!res.ok) return
      const data: MeasurementsListResponse = await res.json()
      // Sort ascending for chart
      const sorted = [...data.measurements].sort((a, b) => a.date.localeCompare(b.date))
      setChartData(sorted)
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    fetchMeasurements(selectedClient, page)
  }, [selectedClient, page, fetchMeasurements])

  useEffect(() => {
    fetchChartData(selectedClient)
  }, [selectedClient, fetchChartData])

  // ─── Handlers ────────────────────────────────────────────────────────────

  function handleClientSelect(name: string) {
    setSelectedClient(name)
    setPage(0)
    setForm(prev => ({ ...prev, client_name: name }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.client_name.trim()) { setError('Client naam is verplicht'); return }

    setSaving(true)
    setError(null)
    try {
      const body = {
        client_name:  form.client_name.trim(),
        date:         form.date,
        weight_kg:    parseNum(form.weight_kg),
        body_fat_pct: parseNum(form.body_fat_pct),
        waist_cm:     parseNum(form.waist_cm),
        hip_cm:       parseNum(form.hip_cm),
        chest_cm:     parseNum(form.chest_cm),
        notes:        form.notes.trim() || null,
      }

      const res = await fetch('/api/measurements', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error ?? 'Save failed')
      }

      // Select the client automatically after save
      const saved = form.client_name.trim()
      setSelectedClient(saved)
      setForm(emptyForm(saved))
      setShowForm(false)
      setPage(0)
      await fetchMeasurements(saved, 0)
      await fetchChartData(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Verwijder deze meting?')) return
    try {
      const res = await fetch(`/api/measurements/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      await fetchMeasurements(selectedClient, page)
      await fetchChartData(selectedClient)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  // ─── Derived state ────────────────────────────────────────────────────────

  const progress = computeProgress(chartData)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#620E06' }}>
            <Ruler className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Metingen</h1>
            <p className="text-zinc-500 text-sm">Lichaamsmetingen per klant bijhouden</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchMeasurements(selectedClient, page)}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            title="Vernieuwen"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => { setShowForm(true); setError(null) }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{ background: '#620E06' }}
          >
            <Plus className="w-4 h-4" />
            Nieuwe meting
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Client selector */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleClientSelect('')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedClient === ''
                ? 'text-white border'
                : 'text-zinc-400 bg-zinc-900 border border-zinc-800 hover:text-white'
            }`}
            style={selectedClient === '' ? { background: '#620E06', borderColor: '#620E06' } : {}}
          >
            Alle klanten
          </button>
          {allClients.map(name => (
            <button
              key={name}
              onClick={() => handleClientSelect(name)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedClient === name
                  ? 'text-white border'
                  : 'text-zinc-400 bg-zinc-900 border border-zinc-800 hover:text-white'
              }`}
              style={selectedClient === name ? { background: '#620E06', borderColor: '#620E06' } : {}}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Progress cards (only when a client is selected) */}
      {selectedClient && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-1">
            <span className="text-zinc-500 text-xs uppercase tracking-widest">Metingen</span>
            <span className="text-lg font-bold text-white">{progress.entries}</span>
          </div>
          {/* invertPositive=true: weight & waist lost = negative delta = good */}
          <StatCard label="Gewicht verloren"    value={progress.weight_lost}    unit="kg" invertPositive />
          <StatCard label="Taille verloren"     value={progress.waist_lost}     unit="cm" invertPositive />
          <StatCard label="Vetmassa verandering" value={progress.body_fat_change} unit="%" invertPositive />
        </div>
      )}

      {/* Chart (only when a client is selected and has data) */}
      {selectedClient && chartData.length > 1 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-widest">
            Progressie — {selectedClient}
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 11, fill: '#71717a' }}
                axisLine={{ stroke: '#3f3f46' }}
                tickLine={false}
              />
              <YAxis
                yAxisId="kg"
                orientation="left"
                tick={{ fontSize: 11, fill: '#71717a' }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <YAxis
                yAxisId="cm"
                orientation="right"
                tick={{ fontSize: 11, fill: '#71717a' }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#a1a1aa' }}
                labelFormatter={(label: unknown) => typeof label === 'string' ? formatDate(label) : String(label)}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#a1a1aa' }} />
              <Line
                yAxisId="kg"
                type="monotone"
                dataKey="weight_kg"
                name="Gewicht (kg)"
                stroke="#620E06"
                strokeWidth={2}
                dot={{ r: 3, fill: '#620E06' }}
                connectNulls
              />
              <Line
                yAxisId="cm"
                type="monotone"
                dataKey="waist_cm"
                name="Taille (cm)"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 3, fill: '#f59e0b' }}
                connectNulls
              />
              <Line
                yAxisId="kg"
                type="monotone"
                dataKey="body_fat_pct"
                name="Vetmassa (%)"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ r: 3, fill: '#22c55e' }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* History table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mb-4">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-widest">
            Historiek{selectedClient ? ` — ${selectedClient}` : ''}
          </h2>
          {total > 0 && (
            <span className="text-zinc-500 text-xs">
              {total} meting{total !== 1 ? 'en' : ''}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-zinc-500">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            Laden...
          </div>
        ) : measurements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-600">
            <Ruler className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Nog geen metingen{selectedClient ? ` voor ${selectedClient}` : ''}</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-xs underline underline-offset-2 hover:text-zinc-300 transition-colors"
              style={{ color: '#9a1515' }}
            >
              Eerste meting toevoegen
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 text-xs uppercase tracking-widest border-b border-zinc-800">
                  <th className="text-left px-5 py-3 font-medium">Datum</th>
                  {!selectedClient && <th className="text-left px-5 py-3 font-medium">Klant</th>}
                  <th className="text-right px-4 py-3 font-medium">Gewicht</th>
                  <th className="text-right px-4 py-3 font-medium">Vetmassa</th>
                  <th className="text-right px-4 py-3 font-medium">Taille</th>
                  <th className="text-right px-4 py-3 font-medium">Heup</th>
                  <th className="text-right px-4 py-3 font-medium">Borst</th>
                  <th className="text-left px-4 py-3 font-medium">Notities</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {measurements.map((m, idx) => (
                  <tr
                    key={m.id}
                    className={`border-b border-zinc-800/50 transition-colors hover:bg-white/[0.02] ${
                      idx % 2 === 0 ? '' : 'bg-white/[0.01]'
                    }`}
                  >
                    <td className="px-5 py-3 text-zinc-300 whitespace-nowrap">{formatDate(m.date)}</td>
                    {!selectedClient && (
                      <td className="px-5 py-3">
                        <button
                          onClick={() => handleClientSelect(m.client_name)}
                          className="text-white hover:underline"
                        >
                          {m.client_name}
                        </button>
                      </td>
                    )}
                    <td className="px-4 py-3 text-right text-white font-mono">
                      {m.weight_kg != null ? `${m.weight_kg} kg` : <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-white font-mono">
                      {m.body_fat_pct != null ? `${m.body_fat_pct}%` : <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-white font-mono">
                      {m.waist_cm != null ? `${m.waist_cm} cm` : <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-white font-mono">
                      {m.hip_cm != null ? `${m.hip_cm} cm` : <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-white font-mono">
                      {m.chest_cm != null ? `${m.chest_cm} cm` : <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 max-w-[180px] truncate">
                      {m.notes ?? ''}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="p-1.5 text-zinc-600 hover:text-red-400 rounded-md transition-colors"
                        title="Verwijderen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Vorige
          </button>
          <span className="text-zinc-500 text-sm">
            Pagina {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/5 transition-colors"
          >
            Volgende <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Add measurement modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4" style={{ color: '#620E06' }} />
                <h2 className="text-base font-semibold text-white">Nieuwe meting</h2>
              </div>
              <button
                onClick={() => { setShowForm(false); setError(null) }}
                className="p-1.5 text-zinc-500 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <p className="text-red-400 text-sm bg-red-900/20 border border-red-700/40 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              {/* Client name */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Klant <span className="text-red-500">*</span>
                </label>
                <input
                  list="clients-list"
                  value={form.client_name}
                  onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                  placeholder="Naam of zoek bestaande klant…"
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
                />
                <datalist id="clients-list">
                  {allClients.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Datum <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-zinc-500"
                />
              </div>

              {/* Measurements grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wider">
                    Gewicht (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="300"
                    value={form.weight_kg}
                    onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))}
                    placeholder="75.5"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wider">
                    Vetmassa (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="60"
                    value={form.body_fat_pct}
                    onChange={e => setForm(f => ({ ...f, body_fat_pct: e.target.value }))}
                    placeholder="18.5"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wider">
                    Taille (cm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="200"
                    value={form.waist_cm}
                    onChange={e => setForm(f => ({ ...f, waist_cm: e.target.value }))}
                    placeholder="82.0"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wider">
                    Heup (cm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="200"
                    value={form.hip_cm}
                    onChange={e => setForm(f => ({ ...f, hip_cm: e.target.value }))}
                    placeholder="95.0"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wider">
                    Borst (cm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="200"
                    value={form.chest_cm}
                    onChange={e => setForm(f => ({ ...f, chest_cm: e.target.value }))}
                    placeholder="100.0"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Notities
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Aantekeningen over deze meting…"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-zinc-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setError(null) }}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700 transition-colors"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
                  style={{ background: '#620E06' }}
                >
                  {saving ? 'Opslaan…' : 'Meting opslaan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
