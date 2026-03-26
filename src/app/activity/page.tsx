'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import {
  Activity, RefreshCw, Filter, ChevronDown, ChevronUp,
  GitCommit, GitPullRequest, Rocket, CheckCircle2, MessageSquare,
  Bot, Clock, ArrowDown,
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import type { TeamActivity, ActionType } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const AGENTS = ['Jarvis', 'Mike', 'Max', 'Kate', 'Lisa', 'Alex', 'Steve', 'Sam']

const AGENT_CONFIG: Record<string, { emoji: string; color: string; bg: string }> = {
  Jarvis: { emoji: '🧠', color: 'text-purple-400', bg: 'bg-purple-900/30' },
  Mike:   { emoji: '⚡', color: 'text-blue-400',   bg: 'bg-blue-900/30'   },
  Max:    { emoji: '📱', color: 'text-cyan-400',    bg: 'bg-cyan-900/30'   },
  Kate:   { emoji: '✍️', color: 'text-pink-400',    bg: 'bg-pink-900/30'   },
  Lisa:   { emoji: '🔑', color: 'text-amber-400',   bg: 'bg-amber-900/30'  },
  Alex:   { emoji: '📈', color: 'text-green-400',   bg: 'bg-green-900/30'  },
  Steve:  { emoji: '🎨', color: 'text-orange-400',  bg: 'bg-orange-900/30' },
  Sam:    { emoji: '🛡️', color: 'text-red-400',     bg: 'bg-red-900/30'    },
}

const ACTION_CONFIG: Record<ActionType, {
  icon: React.ElementType
  label: string
  color: string
  border: string
}> = {
  commit:        { icon: GitCommit,      label: 'Commit',        color: 'text-blue-400',    border: 'border-l-blue-500'    },
  pr:            { icon: GitPullRequest,  label: 'Pull Request',  color: 'text-purple-400',  border: 'border-l-purple-500'  },
  deploy:        { icon: Rocket,          label: 'Deploy',        color: 'text-green-400',   border: 'border-l-green-500'   },
  task_complete: { icon: CheckCircle2,    label: 'Task Done',     color: 'text-emerald-400', border: 'border-l-emerald-500' },
  message:       { icon: MessageSquare,   label: 'Message',       color: 'text-amber-400',   border: 'border-l-amber-500'   },
}

type AgentFilter = string | 'all'
type ActionFilter = ActionType | 'all'

const PAGE_SIZE = 50

// ─── Activity Card ────────────────────────────────────────────────────────────

function ActivityCard({ activity }: { activity: TeamActivity }) {
  const agent = AGENT_CONFIG[activity.agent_name] || { emoji: '🤖', color: 'text-zinc-400', bg: 'bg-zinc-800' }
  const action = ACTION_CONFIG[activity.action_type] || ACTION_CONFIG.message
  const ActionIcon = action.icon
  const [expanded, setExpanded] = useState(false)

  const hasMetadata = activity.metadata && Object.keys(activity.metadata).length > 0

  return (
    <div className={`card border-l-4 ${action.border} hover:border-zinc-700 transition-all duration-200`}>
      <div className="flex items-start gap-4">
        {/* Agent avatar */}
        <div className={`w-10 h-10 rounded-full ${agent.bg} flex items-center justify-center flex-shrink-0 text-lg`}>
          {agent.emoji}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-semibold text-sm ${agent.color}`}>
              {activity.agent_name}
            </span>
            <span className={`badge ${action.color} bg-zinc-800 border border-zinc-700`}>
              <ActionIcon className="w-3 h-3 mr-1" />
              {action.label}
            </span>
          </div>

          <p className="text-white text-sm mt-1 leading-relaxed">
            {activity.description || 'No description'}
          </p>

          {/* Metadata */}
          {hasMetadata && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 mt-2 transition-colors"
            >
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {expanded ? 'Hide' : 'Show'} details
            </button>
          )}

          {expanded && hasMetadata && (
            <div className="mt-2 bg-zinc-800/50 rounded-lg p-3 text-xs text-zinc-400 font-mono overflow-x-auto">
              {Object.entries(activity.metadata).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <span className="text-zinc-500">{key}:</span>
                  <span className="text-zinc-300">{String(value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className="flex flex-col items-end flex-shrink-0">
          <span className="text-xs text-zinc-500 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
          </span>
          <span className="text-[10px] text-zinc-600 mt-0.5">
            {format(new Date(activity.created_at), 'MMM d, HH:mm')}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Date Group Header ────────────────────────────────────────────────────────

function DateHeader({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-px flex-1 bg-zinc-800" />
      <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{date}</span>
      <div className="h-px flex-1 bg-zinc-800" />
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ActivityPage() {
  const [activities, setActivities] = useState<TeamActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [agentFilter, setAgentFilter] = useState<AgentFilter>('all')
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all')
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchActivities = useCallback(async (append = false) => {
    const offset = append ? activities.length : 0
    if (!append) setLoading(true)
    else setLoadingMore(true)

    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) })
      if (agentFilter !== 'all') params.set('agent', agentFilter)
      if (actionFilter !== 'all') params.set('action_type', actionFilter)

      const res = await fetch(`/api/activity?${params}`)
      const json = await res.json()

      if (append) {
        setActivities(prev => [...prev, ...(json.activities || [])])
      } else {
        setActivities(json.activities || [])
      }
      setTotal(json.total || 0)
      setHasMore((json.offset || 0) + (json.activities?.length || 0) < (json.total || 0))
    } catch {
      // silent fail — empty state handles it
    } finally {
      setLoading(false)
      setLoadingMore(false)
      setRefreshing(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentFilter, actionFilter])

  useEffect(() => { fetchActivities() }, [fetchActivities])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchActivities()
  }

  // Group activities by date
  const grouped: { date: string; items: TeamActivity[] }[] = []
  let currentDate = ''
  for (const a of activities) {
    const d = format(new Date(a.created_at), 'EEEE, MMMM d, yyyy')
    if (d !== currentDate) {
      currentDate = d
      grouped.push({ date: d, items: [] })
    }
    grouped[grouped.length - 1].items.push(a)
  }

  // Stats
  const agentCounts: Record<string, number> = {}
  for (const a of activities) {
    agentCounts[a.agent_name] = (agentCounts[a.agent_name] || 0) + 1
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <Activity className="w-7 h-7 text-brand-burgundy" />
            Activity Feed
          </h1>
          <p className="page-subtitle">
            {total} total activit{total === 1 ? 'y' : 'ies'}
            {agentFilter !== 'all' && ` by ${agentFilter}`}
            {actionFilter !== 'all' && ` • ${ACTION_CONFIG[actionFilter]?.label || actionFilter}`}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-secondary self-start"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-zinc-500" />
          <span className="text-sm font-medium text-zinc-400">Filters</span>
        </div>

        {/* Agent filter */}
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => setAgentFilter('all')}
            className={`badge px-3 py-1.5 transition-colors cursor-pointer ${
              agentFilter === 'all'
                ? 'bg-brand-burgundy/20 text-white border border-brand-burgundy/40'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-white'
            }`}
          >
            <Bot className="w-3 h-3 mr-1" />
            All Agents
          </button>
          {AGENTS.map(name => {
            const cfg = AGENT_CONFIG[name]
            return (
              <button
                key={name}
                onClick={() => setAgentFilter(agentFilter === name ? 'all' : name)}
                className={`badge px-3 py-1.5 transition-colors cursor-pointer ${
                  agentFilter === name
                    ? `${cfg.bg} ${cfg.color} border border-current/30`
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-white'
                }`}
              >
                {cfg.emoji} {name}
                {agentCounts[name] ? ` (${agentCounts[name]})` : ''}
              </button>
            )
          })}
        </div>

        {/* Action type filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActionFilter('all')}
            className={`badge px-3 py-1.5 transition-colors cursor-pointer ${
              actionFilter === 'all'
                ? 'bg-brand-burgundy/20 text-white border border-brand-burgundy/40'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-white'
            }`}
          >
            All Types
          </button>
          {(Object.entries(ACTION_CONFIG) as [ActionType, typeof ACTION_CONFIG[ActionType]][]).map(
            ([type, cfg]) => {
              const Icon = cfg.icon
              return (
                <button
                  key={type}
                  onClick={() => setActionFilter(actionFilter === type ? 'all' : type)}
                  className={`badge px-3 py-1.5 transition-colors cursor-pointer ${
                    actionFilter === type
                      ? `bg-zinc-800 ${cfg.color} border border-current/30`
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-3 h-3 mr-1" />
                  {cfg.label}
                </button>
              )
            }
          )}
        </div>
      </div>

      {/* Activity Timeline */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="card">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 skeleton rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-32" />
                  <div className="skeleton h-3 w-64" />
                </div>
                <div className="skeleton h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <div className="card text-center py-16">
          <Activity className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-zinc-400 mb-2">No activity yet</h3>
          <p className="text-sm text-zinc-500">
            Activity from your AI team will appear here as they work on tasks.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {grouped.map(group => (
            <div key={group.date}>
              <DateHeader date={group.date} />
              <div className="space-y-2">
                {group.items.map(activity => (
                  <ActivityCard key={activity.id} activity={activity} />
                ))}
              </div>
            </div>
          ))}

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => fetchActivities(true)}
                disabled={loadingMore}
                className="btn-secondary"
              >
                {loadingMore ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowDown className="w-4 h-4" />
                )}
                Load More
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
