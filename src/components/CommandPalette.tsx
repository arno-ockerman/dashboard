'use client'

import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, LayoutDashboard, Sunrise, Crosshair, Activity,
  Bot, ListTodo, Folder, DollarSign, BarChart2, Users,
  BookOpen, Target, Calendar, Heart, Bell, Trophy, Ruler,
  Dumbbell, Settings, Zap, UserPlus, Plus, ArrowRight,
  Command as CommandIcon, Flame, FileText, TrendingUp,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: React.ElementType
  category: 'navigate' | 'action' | 'search'
  keywords: string[]
  href?: string
  action?: () => void
}

// ─── Command Items ────────────────────────────────────────────────────────────

function useCommands(): CommandItem[] {
  const router = useRouter()

  return useMemo(() => [
    // Navigation
    { id: 'nav-dashboard', label: 'Command Center', description: 'Main dashboard overview', icon: LayoutDashboard, category: 'navigate' as const, keywords: ['home', 'dashboard', 'main', 'overview'], href: '/' },
    { id: 'nav-brief', label: 'Daily Brief', description: 'Morning briefing', icon: Sunrise, category: 'navigate' as const, keywords: ['brief', 'morning', 'daily', 'summary'], href: '/brief' },
    { id: 'nav-focus', label: 'Big 3 Focus', description: "Today's priorities", icon: Crosshair, category: 'navigate' as const, keywords: ['focus', 'big 3', 'priorities', 'today'], href: '/focus' },
    { id: 'nav-activity', label: 'Activity Feed', description: 'Recent activity timeline', icon: Activity, category: 'navigate' as const, keywords: ['activity', 'feed', 'timeline', 'recent'], href: '/activity' },
    { id: 'nav-team', label: 'AI Team', description: 'Agent status & management', icon: Bot, category: 'navigate' as const, keywords: ['team', 'agents', 'ai', 'jarvis', 'mike', 'kate'], href: '/team' },
    { id: 'nav-tasks', label: 'Task Board', description: 'Manage tasks & assignments', icon: ListTodo, category: 'navigate' as const, keywords: ['tasks', 'todo', 'board', 'kanban'], href: '/tasks' },
    { id: 'nav-projects', label: 'Projects', description: 'Active projects overview', icon: Folder, category: 'navigate' as const, keywords: ['projects', 'active', 'initiatives'], href: '/projects' },
    { id: 'nav-sales', label: 'Sales', description: 'Revenue & sales tracking', icon: DollarSign, category: 'navigate' as const, keywords: ['sales', 'revenue', 'money', 'income', 'herbalife'], href: '/sales' },
    { id: 'nav-usage', label: 'Usage', description: 'AI usage & costs', icon: BarChart2, category: 'navigate' as const, keywords: ['usage', 'costs', 'tokens', 'api'], href: '/usage' },
    { id: 'nav-clients', label: 'Clients', description: 'CRM & client management', icon: Users, category: 'navigate' as const, keywords: ['clients', 'crm', 'leads', 'contacts', 'prospects'], href: '/clients' },
    { id: 'nav-knowledge', label: 'Knowledge Base', description: 'Saved links & resources', icon: BookOpen, category: 'navigate' as const, keywords: ['knowledge', 'links', 'resources', 'saved', 'bookmarks'], href: '/knowledge' },
    { id: 'nav-goals', label: 'Goals & Habits', description: 'Track goals and daily habits', icon: Target, category: 'navigate' as const, keywords: ['goals', 'habits', 'streaks', 'tracking'], href: '/goals' },
    { id: 'nav-content', label: 'Content Planner', description: 'Social media content calendar', icon: Calendar, category: 'navigate' as const, keywords: ['content', 'social', 'instagram', 'planner', 'posts'], href: '/content' },
    { id: 'nav-health', label: 'Health', description: 'Health data & readiness', icon: Heart, category: 'navigate' as const, keywords: ['health', 'hrv', 'sleep', 'readiness', 'steps'], href: '/health' },
    { id: 'nav-training', label: 'Training Log', description: 'Workout logging & calendar', icon: Dumbbell, category: 'navigate' as const, keywords: ['training', 'workout', 'gym', 'exercise', 'log'], href: '/training' },
    { id: 'nav-measurements', label: 'Measurements', description: 'Body measurements tracker', icon: Ruler, category: 'navigate' as const, keywords: ['measurements', 'body', 'weight', 'progress'], href: '/measurements' },
    { id: 'nav-challenges', label: 'Challenges', description: 'Fitness challenges', icon: Trophy, category: 'navigate' as const, keywords: ['challenges', 'fitness', 'competition'], href: '/challenges' },
    { id: 'nav-review', label: 'Weekly Review', description: 'Accountability score & reflection', icon: Trophy, category: 'navigate' as const, keywords: ['review', 'weekly', 'score', 'reflection', 'accountability'], href: '/review' },
    { id: 'nav-notifications', label: 'Notifications', description: 'View all notifications', icon: Bell, category: 'navigate' as const, keywords: ['notifications', 'alerts', 'inbox'], href: '/notifications' },
    { id: 'nav-insights', label: 'Insights', description: 'AI-generated insights', icon: TrendingUp, category: 'navigate' as const, keywords: ['insights', 'analytics', 'intelligence', 'suggestions'], href: '/insights' },
    { id: 'nav-files', label: 'Files', description: 'File manager', icon: FileText, category: 'navigate' as const, keywords: ['files', 'documents', 'uploads'], href: '/files' },
    { id: 'nav-settings', label: 'Settings', description: 'Dashboard configuration', icon: Settings, category: 'navigate' as const, keywords: ['settings', 'config', 'preferences', 'instellingen'], href: '/settings' },

    // Quick Actions
    { id: 'act-add-client', label: 'Add New Client', description: 'Create a new client in CRM', icon: UserPlus, category: 'action' as const, keywords: ['add', 'new', 'client', 'create', 'lead'], href: '/clients?modal=add' },
    { id: 'act-log-sale', label: 'Log a Sale', description: 'Record a new sale', icon: DollarSign, category: 'action' as const, keywords: ['log', 'sale', 'record', 'revenue', 'new sale'], href: '/sales?modal=add' },
    { id: 'act-plan-content', label: 'Plan Content', description: 'Schedule a new post', icon: Calendar, category: 'action' as const, keywords: ['plan', 'content', 'post', 'schedule', 'instagram'], href: '/content?modal=add' },
    { id: 'act-save-link', label: 'Save Link', description: 'Add to knowledge base', icon: BookOpen, category: 'action' as const, keywords: ['save', 'link', 'bookmark', 'resource', 'knowledge'], href: '/knowledge?modal=add' },
    { id: 'act-add-task', label: 'Add Task', description: 'Create a new task', icon: Plus, category: 'action' as const, keywords: ['add', 'task', 'todo', 'create'], href: '/tasks?modal=add' },
    { id: 'act-set-focus', label: 'Set Big 3', description: "Set today's priorities", icon: Crosshair, category: 'action' as const, keywords: ['set', 'focus', 'big 3', 'priorities', 'today'], href: '/focus' },
    { id: 'act-log-workout', label: 'Log Workout', description: 'Record a training session', icon: Dumbbell, category: 'action' as const, keywords: ['log', 'workout', 'training', 'gym', 'exercise'], href: '/training?modal=add' },
  ], [])
}

// ─── Category Labels ──────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  action: '⚡ Quick Actions',
  navigate: '📍 Navigate',
  search: '🔍 Search',
}

const CATEGORY_ORDER = ['action', 'navigate']

// ─── Component ────────────────────────────────────────────────────────────────

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const commands = useCommands()

  // Filter commands
  const filtered = useMemo(() => {
    if (!query.trim()) {
      // Show actions first, then popular pages
      return commands.filter(c =>
        c.category === 'action' ||
        ['nav-dashboard', 'nav-focus', 'nav-tasks', 'nav-sales', 'nav-clients', 'nav-content', 'nav-team', 'nav-health'].includes(c.id)
      )
    }
    const q = query.toLowerCase()
    return commands.filter(c =>
      c.label.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.keywords.some(k => k.includes(q))
    )
  }, [query, commands])

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {}
    for (const item of filtered) {
      if (!groups[item.category]) groups[item.category] = []
      groups[item.category].push(item)
    }
    return CATEGORY_ORDER
      .filter(cat => groups[cat]?.length)
      .map(cat => ({ category: cat, items: groups[cat] }))
  }, [filtered])

  // Flat list for keyboard nav
  const flatItems = useMemo(() => grouped.flatMap(g => g.items), [grouped])

  // Keyboard shortcut to open
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Scroll active item into view
  useEffect(() => {
    const activeEl = listRef.current?.querySelector(`[data-index="${activeIndex}"]`)
    activeEl?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const execute = useCallback((item: CommandItem) => {
    setOpen(false)
    if (item.action) {
      item.action()
    } else if (item.href) {
      router.push(item.href)
    }
  }, [router])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(prev => (prev + 1) % flatItems.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(prev => (prev - 1 + flatItems.length) % flatItems.length)
    } else if (e.key === 'Enter' && flatItems[activeIndex]) {
      e.preventDefault()
      execute(flatItems[activeIndex])
    }
  }, [flatItems, activeIndex, execute])

  // Reset active index when filtered results change
  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  if (!open) return null

  let flatIndex = -1

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div className="fixed inset-0 z-[101] flex items-start justify-center pt-[15vh] px-4">
        <div className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 border-b border-zinc-800">
            <Search className="w-5 h-5 text-zinc-500 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command or search…"
              className="flex-1 bg-transparent text-white text-sm py-4 outline-none placeholder-zinc-500"
              autoComplete="off"
              spellCheck={false}
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[10px] text-zinc-500 bg-zinc-800 border border-zinc-700 rounded font-mono">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-2">
            {flatItems.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-zinc-500 text-sm">No results for &ldquo;{query}&rdquo;</p>
                <p className="text-zinc-600 text-xs mt-1">Try a different search term</p>
              </div>
            ) : (
              grouped.map(group => (
                <div key={group.category}>
                  <div className="px-4 py-2">
                    <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
                      {CATEGORY_LABELS[group.category]}
                    </span>
                  </div>
                  {group.items.map(item => {
                    flatIndex++
                    const isActive = flatIndex === activeIndex
                    const idx = flatIndex
                    const Icon = item.icon
                    return (
                      <button
                        key={item.id}
                        data-index={idx}
                        onClick={() => execute(item)}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          isActive
                            ? 'bg-brand-burgundy/20 text-white'
                            : 'text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isActive ? 'bg-brand-burgundy/30' : 'bg-zinc-800'
                        }`}>
                          <Icon className={`w-4 h-4 ${
                            isActive ? 'text-white' : 'text-zinc-400'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.label}</p>
                          {item.description && (
                            <p className={`text-xs truncate ${isActive ? 'text-zinc-400' : 'text-zinc-600'}`}>
                              {item.description}
                            </p>
                          )}
                        </div>
                        {isActive && (
                          <ArrowRight className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3 text-[10px] text-zinc-600">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded font-mono">↑↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded font-mono">↵</kbd>
                select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded font-mono">esc</kbd>
                close
              </span>
            </div>
            <span className="text-[10px] text-zinc-600 flex items-center gap-1">
              <Zap className="w-3 h-3" /> Make It Happen
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
