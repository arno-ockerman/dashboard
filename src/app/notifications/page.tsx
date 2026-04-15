'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Search,
  RefreshCw,
  CheckCheck,
  ExternalLink,
  Trash2,
  X,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Notification, NotificationType } from '@/types'

// ─── Constants ───────────────────────────────────────────────────────────────

type FilterTab = 'all' | NotificationType | 'unread'

const TABS: { id: FilterTab; label: string }[] = [
  { id: 'all',     label: 'All' },
  { id: 'unread',  label: 'Unread' },
  { id: 'error',   label: 'Errors' },
  { id: 'success', label: 'Success' },
  { id: 'warning', label: 'Warnings' },
  { id: 'info',    label: 'Info' },
]

const TYPE_CONFIG: Record<NotificationType, {
  icon: React.ElementType
  color: string
  border: string
  bg: string
  dot: string
}> = {
  error:   { icon: AlertCircle,   color: 'text-red-400',     border: 'border-l-red-500',     bg: 'bg-red-900/10',    dot: 'bg-red-500'     },
  success: { icon: CheckCircle2,  color: 'text-emerald-400', border: 'border-l-emerald-500', bg: 'bg-emerald-900/10',dot: 'bg-emerald-500' },
  warning: { icon: AlertTriangle, color: 'text-amber-400',   border: 'border-l-amber-500',   bg: 'bg-amber-900/10',  dot: 'bg-amber-500'   },
  info:    { icon: Info,          color: 'text-blue-400',    border: 'border-l-blue-500',    bg: 'bg-blue-900/10',   dot: 'bg-blue-500'    },
}

const SOURCE_LABELS: Record<string, string> = {
  'cron/nightly-build':       '🌙 Nightly Build',
  'cron/memory-consolidation':'🧠 Memory Consolidation',
  'cron/backup':              '💾 Backup',
  'cron/test-level1':         '🧪 Level 1 Tests',
  'cron/test-level2':         '🧪 Level 2 Tests',
  'cron/test-level3':         '🧪 Level 3 Tests',
  'system/watchdog':          '🔁 Watchdog',
  'system/health':            '💓 System Health',
  'system/build':             '🏗️ Build System',
  'github/pr':                '🐙 GitHub PR',
  'crm/lead':                 '👤 CRM Lead',
}

function formatSource(source: string): string {
  return SOURCE_LABELS[source] ?? source
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="border-l-4 border-l-zinc-700 bg-zinc-900/40 rounded-r-xl p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 rounded-full bg-zinc-700 flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-zinc-700 rounded w-2/3" />
          <div className="h-3 bg-zinc-800 rounded w-full" />
          <div className="h-3 bg-zinc-800 rounded w-1/2" />
          <div className="flex gap-2 mt-1">
            <div className="h-4 bg-zinc-800 rounded-full w-24" />
            <div className="h-4 bg-zinc-800 rounded-full w-16" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Notification Card ────────────────────────────────────────────────────────

interface CardProps {
  notification: Notification
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
}

function NotificationCard({ notification, onMarkRead, onDelete }: CardProps) {
  const cfg = TYPE_CONFIG[notification.type]
  const Icon = cfg.icon

  const prUrl = notification.metadata?.pr_url as string | undefined

  return (
    <div
      className={`
        group relative border-l-4 ${cfg.border} rounded-r-xl p-4 transition-all duration-200
        cursor-pointer hover:scale-[1.005] hover:shadow-lg hover:shadow-black/20
        ${notification.read
          ? 'bg-zinc-900/40 opacity-75 hover:opacity-100'
          : `${cfg.bg} bg-opacity-80`
        }
      `}
      onClick={() => { if (!notification.read) onMarkRead(notification.id) }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!notification.read) onMarkRead(notification.id) } }}
      aria-label={`${notification.read ? 'Read' : 'Unread'} notification: ${notification.title}`}
    >
      <div className="flex items-start gap-3">
        {/* Type icon */}
        <div className="flex-shrink-0 mt-0.5">
          <Icon className={`w-5 h-5 ${cfg.color}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {!notification.read && (
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} aria-label="Unread" />
              )}
              <h3 className={`font-semibold text-sm leading-snug ${notification.read ? 'text-zinc-300' : 'text-white'}`}>
                {notification.title}
              </h3>
            </div>
            {/* Actions — show on hover */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              {!notification.read && (
                <button
                  onClick={(e) => { e.stopPropagation(); onMarkRead(notification.id) }}
                  className="p-1 rounded hover:bg-zinc-700/60 text-zinc-500 hover:text-emerald-400 transition-colors"
                  title="Mark as read"
                  aria-label="Mark as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(notification.id) }}
                className="p-1 rounded hover:bg-zinc-700/60 text-zinc-600 hover:text-red-400 transition-colors"
                title="Delete"
                aria-label="Delete notification"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <p className={`text-sm mt-1 leading-relaxed ${notification.read ? 'text-zinc-500' : 'text-zinc-300'}`}>
            {notification.message}
          </p>

          {/* Footer: source chip + time + PR link */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/50">
              {formatSource(notification.source)}
            </span>
            <span className="text-xs text-zinc-600">
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
            </span>
            {prUrl && (
              <a
                href={prUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs text-brand-burgundy hover:text-red-400 transition-colors"
              >
                View PR <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

const EMPTY_MESSAGES: Record<FilterTab, { emoji: string; heading: string; sub: string }> = {
  all:     { emoji: '🎉', heading: 'No notifications',        sub: 'Nothing to see here yet.'                  },
  unread:  { emoji: '✅', heading: 'All caught up!',          sub: 'You have no unread notifications.'          },
  error:   { emoji: '🎉', heading: 'No errors. Keep it up!',  sub: 'Everything looks good.'                    },
  success: { emoji: '⏳', heading: 'No successes logged yet', sub: 'Completed tasks will appear here.'          },
  warning: { emoji: '✅', heading: 'No warnings',             sub: 'Your system looks healthy.'                 },
  info:    { emoji: 'ℹ️', heading: 'No info notifications',   sub: 'Informational events will appear here.'     },
}

function EmptyState({ tab }: { tab: FilterTab }) {
  const msg = EMPTY_MESSAGES[tab]
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <span className="text-5xl mb-4">{msg.emoji}</span>
      <h3 className="text-white font-semibold text-lg">{msg.heading}</h3>
      <p className="text-zinc-500 text-sm mt-1">{msg.sub}</p>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [availableSources, setAvailableSources] = useState<string[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [markingAllRead, setMarkingAllRead] = useState(false)
  const [clearingRead, setClearingRead] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchNotifications = useCallback(async (tab: FilterTab = activeTab) => {
    setError(null)
    const params = new URLSearchParams({ limit: '100' })
    if (tab === 'unread') {
      params.set('unread', 'true')
    } else if (tab !== 'all') {
      params.set('type', tab)
    }

    const trimmedQuery = searchQuery.trim()
    if (trimmedQuery) {
      params.set('q', trimmedQuery)
    }

    if (sourceFilter !== 'all') {
      params.set('source', sourceFilter)
    }

    const res = await fetch(`/api/notifications?${params}`)
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string }
      throw new Error(body.error ?? `HTTP ${res.status}`)
    }
    return res.json() as Promise<{ notifications: Notification[]; unreadCount: number; availableSources?: string[] }>
  }, [activeTab, searchQuery, sourceFilter])

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true)
    try {
      const data = await fetchNotifications(activeTab)
      setNotifications(data.notifications)
      setUnreadCount(data.unreadCount)
      setAvailableSources(data.availableSources ?? [])
      setLastRefreshed(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [fetchNotifications, activeTab])

  // Initial load + tab changes
  useEffect(() => {
    setLoading(true)
    const timeout = window.setTimeout(() => {
      load(true)
    }, searchQuery.trim() ? 200 : 0)

    return () => window.clearTimeout(timeout)
  }, [activeTab, searchQuery, sourceFilter, load])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      load(false)
    }, 30_000)
    return () => clearInterval(interval)
  }, [load])

  // ── Actions ──────────────────────────────────────────────────────────────

  const markRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))

    await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: true }),
    }).catch(() => {
      // Revert on failure
      load(false)
    })
  }, [load])

  const deleteNotification = useCallback(async (id: string) => {
    const deleted = notifications.find(n => n.id === id)
    // Optimistic update
    setNotifications(prev => prev.filter(n => n.id !== id))
    if (deleted && !deleted.read) {
      setUnreadCount(prev => Math.max(0, prev - 1))
    }

    await fetch(`/api/notifications/${id}`, { method: 'DELETE' }).catch(() => {
      // Revert on failure
      load(false)
    })
  }, [notifications, load])

  const markAllRead = useCallback(async () => {
    if (unreadCount === 0 || markingAllRead) return
    setMarkingAllRead(true)
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)

    await fetch('/api/notifications/mark-all-read', { method: 'POST' }).catch(() => {
      load(false)
    })
    setMarkingAllRead(false)
  }, [unreadCount, markingAllRead, load])

  const clearRead = useCallback(async () => {
    if (clearingRead) return

    const readCount = notifications.filter((notification) => notification.read).length
    if (readCount === 0) return

    const confirmed = window.confirm(`Delete ${readCount} read notification${readCount === 1 ? '' : 's'}? This cannot be undone.`)
    if (!confirmed) return

    setClearingRead(true)
    try {
      const response = await fetch('/api/notifications/clear-read', { method: 'POST' })
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? 'Failed to clear read notifications')
      }
      await load(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear read notifications')
    } finally {
      setClearingRead(false)
    }
  }, [clearingRead, notifications, load])

  // ── Tab counts ───────────────────────────────────────────────────────────

  const countsByType = notifications.reduce<Record<string, number>>((acc, n) => {
    acc[n.type] = (acc[n.type] ?? 0) + 1
    if (!n.read) acc._unread = (acc._unread ?? 0) + 1
    return acc
  }, {})

  // When showing 'all' tab we have all notifications; otherwise filtered
  // The unreadCount from server is always accurate
  const tabCounts: Record<FilterTab, number> = {
    all:     notifications.length,
    unread:  activeTab === 'unread' ? notifications.length : unreadCount,
    error:   activeTab === 'error'   ? notifications.length : (countsByType.error   ?? 0),
    success: activeTab === 'success' ? notifications.length : (countsByType.success ?? 0),
    warning: activeTab === 'warning' ? notifications.length : (countsByType.warning ?? 0),
    info:    activeTab === 'info'    ? notifications.length : (countsByType.info    ?? 0),
  }

  const readCount = notifications.filter((notification) => notification.read).length

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-burgundy/20 border border-brand-burgundy/30 flex items-center justify-center">
              <Bell className="w-5 h-5 text-brand-burgundy" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Notifications</h1>
              <p className="text-zinc-500 text-sm">
                System events, builds, alerts &amp; more
                {' · '}
                <span className="text-zinc-600">
                  Updated {formatDistanceToNow(lastRefreshed, { addSuffix: true })}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh */}
          <button
            onClick={() => load(true)}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white text-sm transition-all disabled:opacity-50"
            aria-label="Refresh notifications"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Mark all read */}
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={markingAllRead}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-burgundy/20 hover:bg-brand-burgundy/30 border border-brand-burgundy/30 text-brand-burgundy hover:text-red-300 text-sm font-medium transition-all disabled:opacity-50"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
              <span className="bg-brand-burgundy text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                {unreadCount}
              </span>
            </button>
          )}

          {readCount > 0 && (
            <button
              onClick={clearRead}
              disabled={clearingRead}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white text-sm transition-all disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{clearingRead ? 'Clearing...' : 'Clear read'}</span>
              <span className="bg-zinc-800 text-zinc-300 text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                {readCount}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(tab => {
          const count = tabCounts[tab.id]
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                ${isActive
                  ? 'bg-brand-burgundy/20 border border-brand-burgundy/40 text-white'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
                }
              `}
            >
              {tab.label}
              {count > 0 && (
                <span className={`
                  text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center
                  ${isActive
                    ? 'bg-brand-burgundy/40 text-white'
                    : tab.id === 'error'   ? 'bg-red-900/40 text-red-400'
                    : tab.id === 'unread'  ? 'bg-red-900/40 text-red-400'
                    : tab.id === 'warning' ? 'bg-amber-900/40 text-amber-400'
                    : tab.id === 'success' ? 'bg-emerald-900/40 text-emerald-400'
                    : 'bg-zinc-800 text-zinc-400'
                  }
                `}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr),220px]">
        <label className="relative block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title, message or source..."
            className="input pl-9"
          />
        </label>

        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="select"
          aria-label="Filter notifications by source"
        >
          <option value="all">All sources</option>
          {availableSources.map((source) => (
            <option key={source} value={source}>{formatSource(source)}</option>
          ))}
        </select>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-900/20 border border-red-700/30 text-red-300">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">{error}</div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300" aria-label="Dismiss error">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Notification list */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
        ) : notifications.length === 0 ? (
          <EmptyState tab={activeTab} />
        ) : (
          notifications.map(n => (
            <NotificationCard
              key={n.id}
              notification={n}
              onMarkRead={markRead}
              onDelete={deleteNotification}
            />
          ))
        )}
      </div>

      {/* Footer count */}
      {!loading && notifications.length > 0 && (
        <p className="text-center text-zinc-600 text-xs pb-4">
          Showing {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
          {unreadCount > 0 && activeTab === 'all'
            ? ` · ${unreadCount} unread`
            : ''
          }
        </p>
      )}
    </div>
  )
}
