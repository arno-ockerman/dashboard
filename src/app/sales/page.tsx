'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'

import {
  DollarSign, TrendingUp, ShoppingBag, Plus, X, BarChart3,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { format } from 'date-fns'
import type { Sale } from '@/types'

const CATEGORY_COLORS: Record<string, string> = {
  shakes: '#620E06',
  supplements: '#425C59',
  tea: '#D5CBBA',
  aloe: '#a3e635',
  skin: '#f472b6',
  challenge: '#f59e0b',
  other: '#71717a',
}

const categories = ['shakes', 'supplements', 'tea', 'aloe', 'skin', 'challenge', 'other']

interface SalesStats {
  this_month_revenue: number
  this_month_count: number
  last_month_revenue: number
  growth_percent: number
  average_sale: number
  monthly_data: { month: string; year: number; revenue: number; count: number }[]
  product_breakdown: { name: string; value: number }[]
}

interface SaleForm {
  client_name: string
  product_category: string
  product_name: string
  amount: string
  date: string
  notes: string
}

const defaultForm: SaleForm = {
  client_name: '', product_category: 'shakes',
  product_name: '', amount: '',
  date: new Date().toISOString().split('T')[0], notes: '',
}

export default function SalesPage() {
  
  const [stats, setStats] = useState<SalesStats | null>(null)
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<SaleForm>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [filterCategory, setFilterCategory] = useState('all')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [statsRes, salesRes] = await Promise.all([
        fetch('/api/sales/stats'),
        fetch(`/api/sales?limit=50${filterCategory !== 'all' ? `&category=${filterCategory}` : ''}`),
      ])
      setStats(await statsRes.json())
      setSales(await salesRes.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [filterCategory])

  const saveSale = async () => {
    if (!form.amount || isNaN(parseFloat(form.amount))) return
    setSaving(true)
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
        }),
      })
      if (res.ok) {
        setShowModal(false)
        setForm(defaultForm)
        fetchData()
      }
    } finally {
      setSaving(false)
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-xs">
          <p className="text-zinc-400 mb-1">{label}</p>
          <p className="text-white font-bold">€{payload[0].value.toFixed(2)}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl text-white tracking-widest uppercase"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            Sales & Revenue
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Track your Herbalife sales and revenue</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Log Sale
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <div key={i} className="card skeleton h-24" />)}
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="card">
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="w-5 h-5 text-brand-burgundy" />
                <span className="text-zinc-400 text-xs">Revenue This Month</span>
              </div>
              <p className="text-2xl font-bold text-white">€{stats?.this_month_revenue.toFixed(2)}</p>
            </div>
            <div className="card">
              <div className="flex items-center gap-3 mb-2">
                <ShoppingBag className="w-5 h-5 text-brand-green" />
                <span className="text-zinc-400 text-xs">Sales This Month</span>
              </div>
              <p className="text-2xl font-bold text-white">{stats?.this_month_count}</p>
            </div>
            <div className="card">
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-5 h-5 text-brand-amber" />
                <span className="text-zinc-400 text-xs">Average Sale</span>
              </div>
              <p className="text-2xl font-bold text-white">€{stats?.average_sale.toFixed(2)}</p>
            </div>
            <div className="card">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className={`w-5 h-5 ${(stats?.growth_percent ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`} />
                <span className="text-zinc-400 text-xs">Growth vs Last Month</span>
              </div>
              <p className={`text-2xl font-bold ${(stats?.growth_percent ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {(stats?.growth_percent ?? 0) >= 0 ? '+' : ''}{stats?.growth_percent}%
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-3 gap-6 mb-6">
            {/* Revenue chart */}
            <div className="card lg:col-span-2">
              <h2 className="font-semibold text-white mb-4">Revenue Last 12 Months</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats?.monthly_data}>
                  <XAxis dataKey="month" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" fill="#620E06" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Product breakdown */}
            <div className="card">
              <h2 className="font-semibold text-white mb-4">By Category</h2>
              {stats?.product_breakdown && stats.product_breakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={stats.product_breakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {stats.product_breakdown.map((entry, index) => (
                        <Cell key={index} fill={CATEGORY_COLORS[entry.name] || '#71717a'} />
                      ))}
                    </Pie>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <Tooltip formatter={((v: any) => `€${Number(v).toFixed(2)}`) as any} />
                    <Legend
                      formatter={(value) => <span style={{ color: '#a1a1aa', fontSize: '11px' }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 text-zinc-600 text-sm">
                  No sales data yet
                </div>
              )}
            </div>
          </div>

          {/* Sales table */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">Sales History</h2>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="select w-40"
              >
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {sales.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-400 mb-2">No sales yet</p>
                <button onClick={() => setShowModal(true)} className="btn-primary mx-auto">
                  <Plus className="w-4 h-4" /> Log First Sale
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left text-zinc-500 font-medium py-2 pr-4">Date</th>
                      <th className="text-left text-zinc-500 font-medium py-2 pr-4">Client</th>
                      <th className="text-left text-zinc-500 font-medium py-2 pr-4">Product</th>
                      <th className="text-left text-zinc-500 font-medium py-2 pr-4">Category</th>
                      <th className="text-right text-zinc-500 font-medium py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((sale) => (
                      <tr key={sale.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3 pr-4 text-zinc-400">
                          {format(new Date(sale.date), 'MMM d, yyyy')}
                        </td>
                        <td className="py-3 pr-4 text-white">{sale.client_name || '—'}</td>
                        <td className="py-3 pr-4 text-zinc-300">{sale.product_name || '—'}</td>
                        <td className="py-3 pr-4">
                          <span
                            className="badge"
                            style={{
                              backgroundColor: `${CATEGORY_COLORS[sale.product_category]}20`,
                              color: CATEGORY_COLORS[sale.product_category],
                            }}
                          >
                            {sale.product_category}
                          </span>
                        </td>
                        <td className="py-3 text-right font-bold text-white">€{Number(sale.amount).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Log Sale Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Log Sale</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Amount (€) *</label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="input"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Category</label>
                <select
                  value={form.product_category}
                  onChange={(e) => setForm({ ...form, product_category: e.target.value })}
                  className="select"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Product Name</label>
                <input
                  type="text"
                  value={form.product_name}
                  onChange={(e) => setForm({ ...form, product_name: e.target.value })}
                  placeholder="Formula 1 Shake, Afresh..."
                  className="input"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Client Name</label>
                <input
                  type="text"
                  value={form.client_name}
                  onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                  placeholder="Who bought this?"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Any notes..."
                  rows={2}
                  className="input resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button
                  onClick={saveSale}
                  disabled={!form.amount || saving}
                  className="btn-primary flex-1 justify-center"
                >
                  {saving ? 'Saving...' : 'Log Sale'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
