'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Phone, MessageSquare, Mail, Edit2, Save,
  X, Plus, Trash2, Clock, UserCheck, AlertCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import type { Client, Interaction, ClientStatus } from '@/types'

const statusConfig: Record<ClientStatus, { label: string; color: string; bg: string }> = {
  lead: { label: 'Lead', color: 'text-zinc-300', bg: 'bg-zinc-700' },
  prospect: { label: 'Prospect', color: 'text-blue-300', bg: 'bg-blue-900/50' },
  client: { label: 'Client', color: 'text-green-300', bg: 'bg-green-900/50' },
  team_member: { label: 'Team Member', color: 'text-red-300', bg: 'bg-brand-burgundy/30' },
  inactive: { label: 'Inactive', color: 'text-zinc-500', bg: 'bg-zinc-800' },
}

const interactionTypeIcons: Record<string, string> = {
  call: '📞', message: '💬', meeting: '🤝', email: '✉️', social: '📱', other: '📝',
}

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Client>>({})
  const [saving, setSaving] = useState(false)
  const [logForm, setLogForm] = useState({ type: 'message', notes: '' })
  const [logging, setLogging] = useState(false)
  const [showLogForm, setShowLogForm] = useState(false)

  const fetchData = async () => {
    try {
      const [cRes, iRes] = await Promise.all([
        fetch(`/api/clients/${params.id}`),
        fetch(`/api/clients/${params.id}/interactions`),
      ])
      const clientData = await cRes.json()
      const interactionsData = await iRes.json()
      setClient(clientData)
      setEditForm(clientData)
      setInteractions(interactionsData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [params.id])

  const saveClient = async () => {
    setSaving(true)
    try {
      await fetch(`/api/clients/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      await fetchData()
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const logInteraction = async () => {
    if (!logForm.notes.trim()) return
    setLogging(true)
    try {
      await fetch(`/api/clients/${params.id}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logForm),
      })
      setLogForm({ type: 'message', notes: '' })
      setShowLogForm(false)
      fetchData()
    } finally {
      setLogging(false)
    }
  }

  const deleteClient = async () => {
    if (!confirm('Delete this client? This cannot be undone.')) return
    await fetch(`/api/clients/${params.id}`, { method: 'DELETE' })
    router.push('/clients')
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48 rounded" />
        <div className="skeleton h-48 rounded-xl" />
        <div className="skeleton h-64 rounded-xl" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="card text-center py-16">
        <AlertCircle className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
        <p className="text-zinc-400">Client not found</p>
        <Link href="/clients" className="btn-primary mx-auto mt-4">Back to Clients</Link>
      </div>
    )
  }

  const sc = statusConfig[client.status]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/clients" className="btn-ghost p-2">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{client.name}</h1>
            <span className={`badge ${sc.bg} ${sc.color}`}>{sc.label}</span>
          </div>
          <p className="text-zinc-500 text-sm mt-0.5">via {client.source} · Added {format(new Date(client.created_at), 'MMM d, yyyy')}</p>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="btn-secondary">
                <X className="w-4 h-4" /> Cancel
              </button>
              <button onClick={saveClient} disabled={saving} className="btn-primary">
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEditing(true)} className="btn-secondary">
                <Edit2 className="w-4 h-4" /> Edit
              </button>
              <button onClick={deleteClient} className="btn-ghost text-red-400 hover:text-red-300">
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Client Info */}
        <div className="card">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-brand-green" /> Client Info
          </h2>

          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Name</label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as ClientStatus })}
                  className="select"
                >
                  {(Object.keys(statusConfig) as ClientStatus[]).map((s) => (
                    <option key={s} value={s}>{statusConfig[s].label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editForm.phone || ''}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Telegram</label>
                  <input
                    type="text"
                    value={editForm.telegram || ''}
                    onChange={(e) => setEditForm({ ...editForm, telegram: e.target.value })}
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Next Action</label>
                <input
                  type="text"
                  value={editForm.next_action || ''}
                  onChange={(e) => setEditForm({ ...editForm, next_action: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Follow-up Date</label>
                <input
                  type="date"
                  value={editForm.next_follow_up?.split('T')[0] || ''}
                  onChange={(e) => setEditForm({ ...editForm, next_follow_up: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Notes</label>
                <textarea
                  value={editForm.notes || ''}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={4}
                  className="input resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Contact info */}
              <div className="flex flex-col gap-3">
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="flex items-center gap-3 text-sm text-zinc-300 hover:text-white">
                    <Phone className="w-4 h-4 text-zinc-500" /> {client.phone}
                  </a>
                )}
                {client.telegram && (
                  <a
                    href={`https://t.me/${client.telegram.replace('@', '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 text-sm text-zinc-300 hover:text-white"
                  >
                    <MessageSquare className="w-4 h-4 text-zinc-500" /> {client.telegram}
                  </a>
                )}
                {client.email && (
                  <a href={`mailto:${client.email}`} className="flex items-center gap-3 text-sm text-zinc-300 hover:text-white">
                    <Mail className="w-4 h-4 text-zinc-500" /> {client.email}
                  </a>
                )}
              </div>

              {client.next_action && (
                <div className="p-3 bg-amber-950/30 border border-amber-900/30 rounded-lg">
                  <p className="text-xs text-amber-400 font-medium mb-1">Next Action</p>
                  <p className="text-sm text-white">{client.next_action}</p>
                </div>
              )}

              {client.next_follow_up && (
                <div className={`flex items-center gap-2 text-sm ${
                  new Date(client.next_follow_up) <= new Date()
                    ? 'text-red-400'
                    : 'text-zinc-400'
                }`}>
                  <Clock className="w-4 h-4" />
                  Follow-up: {format(new Date(client.next_follow_up), 'EEEE, MMM d, yyyy')}
                </div>
              )}

              {client.notes && (
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Notes</p>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap">{client.notes}</p>
                </div>
              )}

              {client.tags && client.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {client.tags.map((tag) => (
                    <span key={tag} className="badge bg-zinc-800 text-zinc-400">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Interaction Timeline */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-amber" /> Activity Timeline
            </h2>
            <button
              onClick={() => setShowLogForm(!showLogForm)}
              className="btn-primary text-xs py-1.5 px-3"
            >
              <Plus className="w-3 h-3" /> Log
            </button>
          </div>

          {showLogForm && (
            <div className="mb-4 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Type</label>
                  <select
                    value={logForm.type}
                    onChange={(e) => setLogForm({ ...logForm, type: e.target.value })}
                    className="select"
                  >
                    {['call', 'message', 'meeting', 'email', 'social', 'other'].map((t) => (
                      <option key={t} value={t}>{interactionTypeIcons[t]} {t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <textarea
                value={logForm.notes}
                onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                placeholder="What happened? What was discussed?"
                rows={3}
                className="input resize-none mb-3"
              />
              <div className="flex gap-2">
                <button onClick={() => setShowLogForm(false)} className="btn-secondary flex-1 justify-center text-xs">
                  Cancel
                </button>
                <button
                  onClick={logInteraction}
                  disabled={!logForm.notes || logging}
                  className="btn-primary flex-1 justify-center text-xs"
                >
                  {logging ? 'Saving...' : 'Log Interaction'}
                </button>
              </div>
            </div>
          )}

          {interactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-zinc-500 text-sm">No interactions yet</p>
              <p className="text-zinc-600 text-xs mt-1">Log your first contact above</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {interactions.map((interaction, i) => (
                <div key={interaction.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm flex-shrink-0">
                      {interactionTypeIcons[interaction.type]}
                    </div>
                    {i < interactions.length - 1 && (
                      <div className="w-px flex-1 bg-zinc-800 mt-1" />
                    )}
                  </div>
                  <div className="pb-4 min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-zinc-400 capitalize">{interaction.type}</span>
                      <span className="text-xs text-zinc-600">
                        {format(new Date(interaction.created_at), 'MMM d, HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-300">{interaction.notes}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
