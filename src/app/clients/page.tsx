'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'

import { Plus, Search, Users, TrendingUp, UserCheck, Star, X } from 'lucide-react'
import { format } from 'date-fns'
import type { Client, ClientStatus } from '@/types'

const statusConfig: Record<ClientStatus, { label: string; color: string; bg: string }> = {
  lead: { label: 'Lead', color: 'text-zinc-300', bg: 'bg-zinc-700' },
  prospect: { label: 'Prospect', color: 'text-blue-300', bg: 'bg-blue-900/50' },
  client: { label: 'Client', color: 'text-green-300', bg: 'bg-green-900/50' },
  team_member: { label: 'Team', color: 'text-red-300', bg: 'bg-brand-burgundy/30' },
  inactive: { label: 'Inactive', color: 'text-zinc-500', bg: 'bg-zinc-800' },
}

const statuses: ClientStatus[] = ['lead', 'prospect', 'client', 'team_member', 'inactive']
const sources = ['instagram', 'telegram', 'referral', 'website', 'challenge', 'other']

interface AddClientForm {
  name: string
  email: string
  phone: string
  telegram: string
  status: ClientStatus
  source: string
  notes: string
  next_follow_up: string
  next_action: string
}

const defaultForm: AddClientForm = {
  name: '', email: '', phone: '', telegram: '',
  status: 'lead', source: 'other', notes: '',
  next_follow_up: '', next_action: '',
}

export default function ClientsPage() {
  
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<AddClientForm>(defaultForm)
  const [saving, setSaving] = useState(false)

  const fetchClients = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus !== 'all') params.set('status', filterStatus)
      if (search) params.set('search', search)
      const res = await fetch(`/api/clients?${params}`)
      setClients(await res.json())
    } finally {
      setLoading(false)
    }
  }, [filterStatus, search])

  useEffect(() => {
    const timer = setTimeout(fetchClients, 300)
    return () => clearTimeout(timer)
  }, [fetchClients])

  const saveClient = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          next_follow_up: form.next_follow_up || null,
          tags: [],
        }),
      })
      if (res.ok) {
        setShowModal(false)
        setForm(defaultForm)
        fetchClients()
      }
    } finally {
      setSaving(false)
    }
  }

  // Pipeline counts
  const pipeline = statuses.map((s) => ({
    status: s,
    count: clients.filter((c) => c.status === s).length,
  }))

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl text-white tracking-widest uppercase"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            Clients
          </h1>
          <p className="text-zinc-400 text-sm mt-1">{clients.length} contacts in pipeline</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      {/* Pipeline view */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
        {pipeline.map(({ status, count }) => (
          <button
            key={status}
            onClick={() => setFilterStatus(filterStatus === status ? 'all' : status)}
            className={`card text-center hover:border-zinc-600 transition-all cursor-pointer ${filterStatus === status ? 'border-brand-burgundy/60 bg-brand-burgundy/5' : ''}`}
          >
            <div className={`text-2xl font-bold ${statusConfig[status].color}`}>{count}</div>
            <div className="text-xs text-zinc-500 mt-1 capitalize">{statusConfig[status].label}s</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="select sm:w-40"
        >
          <option value="all">All statuses</option>
          {statuses.map((s) => (
            <option key={s} value={s}>{statusConfig[s].label}</option>
          ))}
        </select>
      </div>

      {/* Client list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="card skeleton h-20" />)}
        </div>
      ) : clients.length === 0 ? (
        <div className="card text-center py-16">
          <Users className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-400 text-lg font-medium mb-2">No clients found</p>
          <p className="text-zinc-600 text-sm mb-6">
            {search || filterStatus !== 'all' ? 'Try adjusting your filters' : 'Add your first client to get started'}
          </p>
          <button onClick={() => setShowModal(true)} className="btn-primary mx-auto">
            <Plus className="w-4 h-4" /> Add First Client
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {clients.map((client) => (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className="card-hover flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-brand-green/20 flex items-center justify-center text-brand-green font-bold flex-shrink-0">
                {client.name[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-white">{client.name}</span>
                  <span className={`badge ${statusConfig[client.status].bg} ${statusConfig[client.status].color}`}>
                    {statusConfig[client.status].label}
                  </span>
                  {client.tags?.map((tag) => (
                    <span key={tag} className="badge bg-zinc-800 text-zinc-400">{tag}</span>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-zinc-500">
                  {client.phone && <span>📞 {client.phone}</span>}
                  {client.telegram && <span>✈️ {client.telegram}</span>}
                  {client.email && <span>✉️ {client.email}</span>}
                  <span>via {client.source}</span>
                </div>
                {client.next_action && (
                  <p className="text-xs text-amber-400 mt-1">→ {client.next_action}</p>
                )}
              </div>
              <div className="flex-shrink-0 text-right">
                {client.next_follow_up && (
                  <div className={`text-xs font-medium ${
                    new Date(client.next_follow_up) <= new Date()
                      ? 'text-red-400'
                      : 'text-zinc-500'
                  }`}>
                    {format(new Date(client.next_follow_up), 'MMM d')}
                  </div>
                )}
                <div className="text-xs text-zinc-600 mt-1">
                  {format(new Date(client.updated_at), 'MMM d')}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Add Client Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Add Client</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Full name"
                  className="input"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as ClientStatus })}
                    className="select"
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>{statusConfig[s].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Source</label>
                  <select
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                    className="select"
                  >
                    {sources.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Phone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+32..."
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Telegram</label>
                  <input
                    type="text"
                    value={form.telegram}
                    onChange={(e) => setForm({ ...form, telegram: e.target.value })}
                    placeholder="@username"
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@example.com"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Next Action</label>
                <input
                  type="text"
                  value={form.next_action}
                  onChange={(e) => setForm({ ...form, next_action: e.target.value })}
                  placeholder="What's the next step?"
                  className="input"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Follow-up Date</label>
                <input
                  type="date"
                  value={form.next_follow_up}
                  onChange={(e) => setForm({ ...form, next_follow_up: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Any notes about this client..."
                  rows={3}
                  className="input resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">
                  Cancel
                </button>
                <button
                  onClick={saveClient}
                  disabled={!form.name || saving}
                  className="btn-primary flex-1 justify-center"
                >
                  {saving ? 'Saving...' : 'Add Client'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
