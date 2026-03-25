'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Activity, RefreshCw, DollarSign, Users, CheckCircle2,
  Target, Bot, ListTodo, BookOpen, Calendar, Filter,
  ChevronDown, ArrowRight, Flame, Heart,
} from 'lucide-react'
import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityItem {
  id: string
  type: 'sale' | 'client' | 'habit' | 'goal' | 'content' | 'team' | 'task' | 'health' | 'knowledge'
  title: string
  description?: string
  metadata?: Record<string, unknown>
  timestamp: string
}

type ActivityType = ActivityItem['type']

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<ActivityType, {
  icon: React.ElementType
  color: string
  bg: string
  label: string
  href?: string
}> = {
  sale: {
    icon: DollarSign,
    color: 'text-brand-burgundy',
    bg: 'bg-brand-burgundy/15',
    label: 'Sales',
    href: '/sales',
  },
  client: {
    icon: Users,
    color: 'text-brand-green',
    bg: 'bg-brand-green/15',
    label: 'Clients',
    href: '/clients',
  },
  habit: {
    icon: Flame,
    color: 'text-orange-400',
    bg: 'bg-orange-400/15',
    label: 'Habits',
    href: '/goals',
  },
  goal: {
    icon: Target,
    color: 'text-brand-burgundy',
    bg: 'bg-brand-burgundy/10',
    label: 'Goals',
    href: '/goals',
  },
  content: {
    icon: Calendar,
    color: 'text-brand-amber',
    bg: 'bg-brand-amber/15',
    label: 'Content',
    href: '/content',
  },
  team: {
    icon: Bot,
    color: 'text-purple-400',
    bg: 'bg-purple-400/15',
    label: 'AI Team',
    href: '/team',
  },
  task: {
    icon: ListTodo,
    color: 'text-blue-400',
    bg: 'bg-blue-400/15',
    label: 'Tasks',
    href: '/tasks',
  },
  health: {
    icon: Heart,
    color: 'text-rose-400',
    bg: 'bg-rose-400/15',
    label: 'Health',
    href: '/health',
  },
  knowledge: {
    icon: BookOpen,
    color: 'text-indigo-400',
    bg: 'bg-indigo-400/15',
    label: 'Knowledge',
    href: '/knowledge',
  },
}

const ALL_TYPES: ActivityType[] = ['sale', 'client', 'habit', 'goal', 'team', 'task', 'knowledge', 'content', 'health']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupByDate(items: ActivityItem[]): Map<string, ActivityItem[]> {
  const groups = new Map<string, ActivityItem[]>()
  for (const item of items) {
    const date = item.timestamp.split('T')[0]
    if (!groups.has(date)) groups.set(date, [])
    groups.get(date)!.push(item)
  }
  return groups
}

function formatDateLabel(dateStr: string): string {
  const date = parseISO(dateStr)
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'EEEE, MMMM d')
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilters, setActiveFilters] = useState<Set<ActivityType>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [days, setDays] = useState(30)

  const fetchActivity = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/activity?days=${days}&limit=100`)
      const data = await res.json()
      setActivities(data.activities || [])
    } catch (e) {
      console.error('Failed to fetch activity:', e)
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    fetchActivity()
  }, [fetchActivity])

  const toggleFilter = (type: ActivityType) => {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  const filtered = activeFilters.size === 0
    ? activities
    : activities.filter((a) => activeFilters.has(a.type))

  const grouped = groupByDate(filtered)

  // Stats
  const typeCounts = new Map<ActivityType, number>()
  for (const a of activities) {
    typeCounts.set(a.type, (typeCounts.get(a.type) || 0) + 1)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-3xl text-white tracking-widest uppercase"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            Activity Timeline
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Everything that happened — last {days} days
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white px-3 py-2 min-h-[44px] touch-manipulation"
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
          </select>
          <button onClick={fetchActivity} className="btn-ghost" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Type summary chips */}
      <div className="card mb-6">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors w-full"
        >
          <Filter className="w-4 h-4" />
          <span className="font-medium">
            {activeFilters.size === 0
              ? `All activity (${activities.length})`
              : `${activeFilters.size} filter${activeFilters.size > 1 ? 's' : ''} active (${filtered.length})`
            }
          </span>
          <ChevronDown className={`w-4 h-4 ml-auto transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        {showFilters && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-zinc-800">
            {ALL_TYPES.map((type) => {
              const config = TYPE_CONFIG[type]
              const count = typeCounts.get(type) || 0
              const active = activeFilters.has(type)
              const Icon = config.icon
              return (
                <button
                  key={type}
                  onClick={() => toggleFilter(type)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border touch-manipulation ${
                    active
                      ? `${config.bg} ${config.color} border-current`
                      : 'bg-zinc-800/50 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {config.label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    active ? 'bg-white/10' : 'bg-zinc-700/50'
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}
            {activeFilters.size > 0 && (
              <button
                onClick={() => setActiveFilters(new Set())}
                className="text-xs text-zinc-500 hover:text-white px-2 py-2 touch-manipulation"
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Activity className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-400 text-lg font-medium mb-2">No activity found</p>
          <p className="text-zinc-600 text-sm">
            {activeFilters.size > 0
              ? 'Try removing some filters'
              : `Nothing happened in the last ${days} days`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([dateStr, items]) => (
            <div key={dateStr}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="text-sm font-semibold text-white">
                  {formatDateLabel(dateStr)}
                </div>
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-xs text-zinc-600">
                  {items.length} event{items.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Events */}
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-5 top-0 bottom-0 w-px bg-zinc-800" />

                <div className="space-y-1">
                  {items.map((item, idx) => {
                    const config = TYPE_CONFIG[item.type]
                    const Icon = config.icon
                    return (
                      <div
                        key={item.id}
                        className="relative flex items-start gap-4 pl-0 group"
                      >
                        {/* Timeline dot */}
                        <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${config.bg} border-2 border-zinc-900 group-hover:scale-110 transition-transform`}>
                          <Icon className={`w-4 h-4 ${config.color}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pb-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm text-white font-medium truncate">
                                {item.title}
                              </p>
                              {item.description && (
                                <p className="text-xs text-zinc-500 mt-0.5 truncate">
                                  {item.description}
                                </p>
                              )}
                            </div>
                            <span className="text-[10px] text-zinc-600 flex-shrink-0 mt-0.5" suppressHydrationWarning>
                              {format(parseISO(item.timestamp), 'HH:mm')}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick links */}
      {!loading && filtered.length > 0 && (
        <div className="card mt-8">
          <p className="text-xs text-zinc-600 uppercase tracking-widest font-semibold mb-3">Quick Links</p>
          <div className="flex flex-wrap gap-2">
            {ALL_TYPES.filter((t) => (typeCounts.get(t) || 0) > 0).map((type) => {
              const config = TYPE_CONFIG[type]
              const Icon = config.icon
              return config.href ? (
                <Link
                  key={type}
                  href={config.href}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {config.label}
                  <ArrowRight className="w-3 h-3" />
                </Link>
              ) : null
            })}
          </div>
        </div>
      )}
    </div>
  )
}
