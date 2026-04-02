'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  Users, RefreshCw, ArrowRight, ChevronRight,
  UserPlus, Phone, Mail, Instagram, MessageCircle,
  Clock, Zap, AlertTriangle, Star, TrendingUp,
  GripVertical, ChevronLeft,
} from 'lucide-react'
import { format, formatDistanceToNow, parseISO, isPast, isToday } from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────

type ClientStatus = 'lead' | 'prospect' | 'client' | 'team_member' | 'inactive'

interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  telegram?: string
  status: ClientStatus
  tags: string[]
  source: string
  notes?: string
  next_follow_up?: string
  next_action?: string
  last_contact?: string
  created_at: string
  updated_at: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COLUMNS: {
  id: ClientStatus
  label: string
  emoji: string
  color: string
  border: string
  bg: string
  dot: string
  next: ClientStatus | null
}[] = [
  {
    id: 'lead',
    label: 'Leads',
    emoji: '🎯',
    color: 'text-zinc-300',
    border: 'border-zinc-700',
    bg: 'bg-zinc-800/40',
    dot: 'bg-zinc-400',
    next: 'prospect',
  },
  {
    id: 'prospect',
    label: 'Prospects',
    emoji: '🔍',
    color: 'text-blue-300',
    border: 'border-blue-800/60',
    bg: 'bg-blue-900/10',
    dot: 'bg-blue-400',
    next: 'client',
  },
  {
    id: 'client',
    label: 'Clients',
    emoji: '✅',
    color: 'text-emerald-300',
    border: 'border-emerald-800/50',
    bg: 'bg-emerald-900/10',
    dot: 'bg-emerald-400',
    next: 'team_member',
  },
  {
    id: 'team_member',
    label: 'Team',
    emoji: '⭐',
    color: 'text-amber-300',
    border: 'border-amber-800/50',
    bg: 'bg-amber-900/10',
    dot: 'bg-amber-400',
    next: null,
  },
  {
    id: 'inactive',
    label: 'Inactive',
    emoji: '💤',
    color: 'text-zinc-500',
    border: 'border-zinc-800',
    bg: 'bg-zinc-900/40',
    dot: 'bg-zinc-600',
    next: null,
  },
]

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  instagram: <Instagram className="w-3 h-3" />,
  telegram: <MessageCircle className="w-3 h-3" />,
  referral: <Star className="w-3 h-3" />,
  website: <TrendingUp className="w-3 h-3" />,
  challenge: <Zap className="w-3 h-3" />,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function followUpUrgency(followUp?: string): 'overdue' | 'today' | 'upcoming' | 'none' {
  if (!followUp) return 'none'
  const d = parseISO(followUp)
  if (isPast(d) && !isToday(d)) return 'overdue'
  if (isToday(d)) return 'today'
  return 'upcoming'
}

// ─── Client Card ──────────────────────────────────────────────────────────────

function ClientCard({
  client,
  onStatusChange,
  onDragStart,
  onDragEnd,
  isDragging,
}: {
  client: Client
  onStatusChange: (id: string, status: ClientStatus) => void
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragEnd: () => void
  isDragging: boolean
}) {
  const col = COLUMNS.find((c) => c.id === client.status)!
  const urgency = followUpUrgency(client.next_follow_up)

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, client.id)}
      onDragEnd={onDragEnd}
      className={`group relative bg-zinc-900 border rounded-xl p-3 cursor-grab active:cursor-grabbing select-none transition-all duration-200 ${
        isDragging ? 'opacity-40 scale-95' : 'hover:border-zinc-600 hover:shadow-lg hover:shadow-black/30'
      } ${
        urgency === 'overdue'
          ? 'border-red-800/60'
          : urgency === 'today'
          ? 'border-amber-700/60'
          : 'border-zinc-800'
      }`}
    >
      {/* Urgency indicator */}
      {urgency === 'overdue' && (
        <div className="absolute top-2 right-2 flex items-center gap-1 text-red-400 text-[10px] font-medium">
          <AlertTriangle className="w-3 h-3" />
          Overdue
        </div>
      )}
      {urgency === 'today' && (
        <div className="absolute top-2 right-2 flex items-center gap-1 text-amber-400 text-[10px] font-medium">
          <Clock className="w-3 h-3" />
          Today
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-brand-burgundy/20 flex items-center justify-center text-sm font-bold text-brand-burgundy flex-shrink-0">
          {client.name[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <Link
            href={`/clients/${client.id}`}
            className="text-sm font-semibold text-white hover:text-brand-burgundy transition-colors truncate block"
            onClick={(e) => e.stopPropagation()}
          >
            {client.name}
          </Link>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {client.source && SOURCE_ICONS[client.source] && (
              <span className="text-zinc-500 flex items-center gap-0.5 text-[10px]">
                {SOURCE_ICONS[client.source]}
                {client.source}
              </span>
            )}
            {client.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="text-[10px] bg-zinc-800 text-zinc-400 rounded px-1.5 py-0.5">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <GripVertical className="w-4 h-4 text-zinc-700 flex-shrink-0 group-hover:text-zinc-500 transition-colors mt-0.5" />
      </div>

      {/* Next Action */}
      {client.next_action && (
        <p className="text-xs text-zinc-400 mb-2 line-clamp-2 pl-9">
          → {client.next_action}
        </p>
      )}

      {/* Contact icons */}
      <div className="flex items-center gap-2 pl-9">
        {client.phone && (
          <a href={`tel:${client.phone}`} className="text-zinc-600 hover:text-zinc-300 transition-colors">
            <Phone className="w-3 h-3" />
          </a>
        )}
        {client.email && (
          <a href={`mailto:${client.email}`} className="text-zinc-600 hover:text-zinc-300 transition-colors">
            <Mail className="w-3 h-3" />
          </a>
        )}
        {client.telegram && (
          <a
            href={`https://t.me/${client.telegram.replace('@', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            <MessageCircle className="w-3 h-3" />
          </a>
        )}
        <span className="ml-auto text-[10px] text-zinc-600">
          {formatDistanceToNow(parseISO(client.updated_at), { addSuffix: true })}
        </span>
      </div>

      {/* Promote / demote buttons */}
      <div className="hidden group-hover:flex items-center justify-between mt-2 pt-2 border-t border-zinc-800">
        {col.next ? (
          <button
            onClick={() => onStatusChange(client.id, col.next!)}
            className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-zinc-800"
          >
            Move to {COLUMNS.find((c) => c.id === col.next)?.label}
            <ChevronRight className="w-3 h-3" />
          </button>
        ) : (
          <span />
        )}
        <Link
          href={`/clients/${client.id}`}
          className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded-lg hover:bg-zinc-800"
          onClick={(e) => e.stopPropagation()}
        >
          View <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  )
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  col,
  clients,
  onStatusChange,
  draggingId,
  onDragStart,
  onDragEnd,
  onDrop,
  onDragOver,
  onDragLeave,
  isDropTarget,
}: {
  col: (typeof COLUMNS)[0]
  clients: Client[]
  onStatusChange: (id: string, status: ClientStatus) => void
  draggingId: string | null
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragEnd: () => void
  onDrop: (e: React.DragEvent, status: ClientStatus) => void
  onDragOver: (e: React.DragEvent, status: ClientStatus) => void
  onDragLeave: () => void
  isDropTarget: boolean
}) {
  return (
    <div className="flex-1 min-w-[240px] max-w-[300px] flex flex-col">
      {/* Column header */}
      <div
        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3 border ${col.border} ${col.bg}`}
      >
        <span className="text-base">{col.emoji}</span>
        <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
        <span className="ml-auto text-xs bg-zinc-800 text-zinc-400 rounded-full px-2 py-0.5 font-mono">
          {clients.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        onDrop={(e) => onDrop(e, col.id)}
        onDragOver={(e) => onDragOver(e, col.id)}
        onDragLeave={onDragLeave}
        className={`flex-1 rounded-xl transition-all duration-150 min-h-[200px] ${
          isDropTarget
            ? `ring-2 ring-brand-burgundy/60 bg-brand-burgundy/5 ring-offset-1 ring-offset-zinc-950`
            : ''
        }`}
      >
        <div className="space-y-2 p-1">
          {clients.length === 0 && (
            <div className="flex items-center justify-center h-24 text-zinc-700 text-xs text-center border-2 border-dashed border-zinc-800 rounded-xl">
              Drop here
            </div>
          )}
          {clients.map((c) => (
            <ClientCard
              key={c.id}
              client={c}
              onStatusChange={onStatusChange}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              isDragging={draggingId === c.id}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Pipeline Stats Bar ───────────────────────────────────────────────────────

function PipelineStats({ clients }: { clients: Client[] }) {
  const total = clients.length
  const byStatus = Object.fromEntries(
    COLUMNS.map((c) => [c.id, clients.filter((cl) => cl.status === c.id).length])
  ) as Record<ClientStatus, number>

  const convRate =
    total > 0
      ? Math.round(((byStatus.client + byStatus.team_member) / total) * 100)
      : 0

  const overdueCount = clients.filter(
    (c) => c.next_follow_up && isPast(parseISO(c.next_follow_up)) && !isToday(parseISO(c.next_follow_up))
  ).length

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div className="card py-3">
        <p className="text-xs text-zinc-500 mb-1">Total Pipeline</p>
        <p className="text-2xl font-bold text-white">{total - byStatus.inactive}</p>
        <p className="text-xs text-zinc-600 mt-0.5">active contacts</p>
      </div>
      <div className="card py-3">
        <p className="text-xs text-zinc-500 mb-1">Conversion Rate</p>
        <p className="text-2xl font-bold text-emerald-400">{convRate}%</p>
        <p className="text-xs text-zinc-600 mt-0.5">leads → clients</p>
      </div>
      <div className="card py-3">
        <p className="text-xs text-zinc-500 mb-1">Team Members</p>
        <p className="text-2xl font-bold text-amber-400">{byStatus.team_member}</p>
        <p className="text-xs text-zinc-600 mt-0.5">in your downline</p>
      </div>
      <div
        className={`card py-3 ${overdueCount > 0 ? 'border-red-800/40' : ''}`}
      >
        <p className="text-xs text-zinc-500 mb-1">Overdue Follow-ups</p>
        <p className={`text-2xl font-bold ${overdueCount > 0 ? 'text-red-400' : 'text-zinc-400'}`}>
          {overdueCount}
        </p>
        <p className="text-xs text-zinc-600 mt-0.5">need attention</p>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<ClientStatus | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  const fetchClients = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/clients')
      if (!res.ok) throw new Error('Failed to load')
      const data: Client[] = await res.json()
      setClients(data)
    } catch (e) {
      setError('Could not load clients')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  // ─ Status change (optimistic)
  const handleStatusChange = useCallback(async (id: string, newStatus: ClientStatus) => {
    const prev = clients.find((c) => c.id === id)
    if (!prev || prev.status === newStatus) return

    setClients((cs) =>
      cs.map((c) => (c.id === id ? { ...c, status: newStatus, updated_at: new Date().toISOString() } : c))
    )
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Update failed')
    } catch {
      // Revert
      setClients((cs) => cs.map((c) => (c.id === id ? prev : c)))
    } finally {
      setUpdatingId(null)
    }
  }, [clients])

  // ─ Drag & drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('clientId', id)
    e.dataTransfer.effectAllowed = 'move'
    setDraggingId(id)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggingId(null)
    setDropTarget(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, status: ClientStatus) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTarget(status)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDropTarget(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, status: ClientStatus) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('clientId')
    setDropTarget(null)
    if (id) handleStatusChange(id, status)
  }, [handleStatusChange])

  // ─ Filtered clients per column
  const filtered = clients.filter((c) =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  )

  const visibleColumns = showInactive ? COLUMNS : COLUMNS.filter((c) => c.id !== 'inactive')

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-3xl text-white tracking-widest uppercase"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            Client Pipeline
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Drag cards between columns to move clients through your funnel
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/clients"
            className="btn-ghost text-sm"
          >
            <Users className="w-4 h-4" />
            List View
          </Link>
          <Link
            href="/clients?modal=add"
            className="btn-primary text-sm"
          >
            <UserPlus className="w-4 h-4" />
            Add Client
          </Link>
          <button onClick={fetchClients} className="btn-ghost" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="card border-red-800/50 bg-red-900/10 mb-6 text-sm text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Stats */}
      {!loading && <PipelineStats clients={clients} />}

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
            >
              ×
            </button>
          )}
        </div>
        <button
          onClick={() => setShowInactive((v) => !v)}
          className={`btn-ghost text-sm ${showInactive ? 'text-white bg-zinc-800' : ''}`}
        >
          {showInactive ? 'Hide Inactive' : 'Show Inactive'}
        </button>
      </div>

      {/* Kanban board */}
      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.slice(0, 4).map((col) => (
            <div key={col.id} className="flex-1 min-w-[240px]">
              <div className="skeleton h-10 rounded-xl mb-3" />
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-6">
          {visibleColumns.map((col) => (
            <KanbanColumn
              key={col.id}
              col={col}
              clients={filtered.filter((c) => c.status === col.id)}
              onStatusChange={handleStatusChange}
              draggingId={draggingId}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              isDropTarget={dropTarget === col.id}
            />
          ))}
        </div>
      )}

      {updatingId && (
        <div className="fixed bottom-4 right-4 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-300 flex items-center gap-2 shadow-xl">
          <div className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
          Updating...
        </div>
      )}
    </div>
  )
}
