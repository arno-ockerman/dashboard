'use client'

import { useEffect, useId, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  DollarSign,
  BarChart2,
  Users,
  BookOpen,
  Target,
  Calendar,
  Menu,
  X,
  TrendingUp,
  Zap,
  Crosshair,
  Sunrise,
  ListTodo,
  Folder,
  FolderOpen,
  Settings,
  Bot,
  Lightbulb,
  Heart,
  Bell,
  Trophy,
  Ruler,
  Flame,
  Dumbbell,
  Activity,
  Search,
} from 'lucide-react'
import MissionControl from './MissionControl'

const NAV_SECTIONS = [
  {
    label: 'Workspace',
    links: [
      { href: '/', label: 'Command Center', icon: LayoutDashboard },
      { href: '/brief', label: 'Daily Brief', icon: Sunrise },
      { href: '/focus', label: 'Big 3 Focus', icon: Crosshair },
      { href: '/activity', label: 'Activity', icon: Activity },
    ],
  },
  {
    label: 'AI Team',
    links: [
      { href: '/team', label: 'Team', icon: Bot },
      { href: '/tasks', label: 'Task Board', icon: ListTodo },
      { href: '/projects', label: 'Projects', icon: Folder },
      { href: '/activity', label: 'Activity Feed', icon: Activity },
    ],
  },
  {
    label: 'Business',
    links: [
      { href: '/sales', label: 'Sales', icon: DollarSign },
      { href: '/usage', label: 'Usage', icon: BarChart2 },
      { href: '/clients', label: 'Clients', icon: Users },
      { href: '/pipeline', label: 'Pipeline', icon: TrendingUp },
      { href: '/challenges', label: '21-Day Challenges', icon: Flame },
      { href: '/measurements', label: 'Metingen', icon: Ruler },
      { href: '/content', label: 'Content', icon: Calendar },
      { href: '/goals', label: 'Goals & Habits', icon: Target },
      { href: '/training', label: 'Training Log', icon: Dumbbell },
      { href: '/health', label: 'Health & Recovery', icon: Heart },
      { href: '/review', label: 'Weekly Review', icon: Trophy },
      { href: '/insights', label: 'BI Council', icon: Lightbulb },
    ],
  },
  {
    label: 'Knowledge',
    links: [
      { href: '/knowledge', label: 'Knowledge Base', icon: BookOpen },
      { href: '/files', label: 'Files', icon: FolderOpen },
    ],
  },
  {
    label: 'Systeem',
    links: [
      { href: '/notifications', label: 'Notifications', icon: Bell },
      { href: '/settings', label: 'Instellingen', icon: Settings },
    ],
  },
]

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const pathname = usePathname()
  const drawerId = useId()

  // Fetch unread notification count on mount (and periodically)
  useEffect(() => {
    const fetchUnread = () => {
      fetch('/api/notifications?unread=true&limit=1')
        .then(r => r.ok ? r.json() : Promise.reject())
        .then((data: { unreadCount?: number }) => setUnreadCount(data.unreadCount ?? 0))
        .catch(() => {})
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 60_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!mobileOpen) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [mobileOpen])

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-burgundy rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div
              className="text-white font-bold text-lg leading-none tracking-widest uppercase"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              Make It Happen
            </div>
            <div className="text-brand-stardust text-xs mt-0.5 tracking-wider">REDEFINE LIMITS</div>
          </div>
        </div>
      </div>

      {/* Command Palette trigger */}
      <div className="px-4 pt-4">
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all text-sm"
        >
          <Search className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="hidden sm:inline-flex text-[10px] text-zinc-500 bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 font-mono">⌘K</kbd>
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="text-zinc-600 text-xs font-semibold uppercase tracking-widest px-4 mb-2">
              {section.label}
            </p>
            <div className="space-y-1">
              {section.links.map(({ href, label, icon: Icon }) => {
                const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
                const isNotifications = href === '/notifications'
                const showBadge = isNotifications && unreadCount > 0
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'text-white bg-brand-burgundy/20 border border-brand-burgundy/40'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-brand-burgundy' : ''}`} />
                    {label}
                    {showBadge ? (
                      <span className="ml-auto text-xs bg-red-600 text-white rounded-full px-1.5 py-0.5 min-w-[20px] text-center leading-none">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    ) : isActive ? (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-burgundy" />
                    ) : null}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Real-time Status */}
      <MissionControl />

      {/* Bottom brand */}
      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gradient-to-r from-brand-burgundy/10 to-brand-green/10 border border-zinc-800">
          <TrendingUp className="w-4 h-4 text-brand-amber flex-shrink-0" />
          <div>
            <div className="text-white text-xs font-semibold">Arno Ockerman</div>
            <div className="text-zinc-500 text-xs">Make It Happen</div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-zinc-900 border-r border-zinc-800 flex-shrink-0">
        <NavContent />
      </aside>

      {/* Mobile toggle */}
      <button
        type="button"
        aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={mobileOpen}
        aria-controls={drawerId}
        className="lg:hidden fixed top-3 left-3 z-50 p-3 bg-zinc-900/90 border border-zinc-800 rounded-xl text-white shadow-lg shadow-black/30 backdrop-blur touch-manipulation"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        id={drawerId}
        className={`lg:hidden fixed top-0 left-0 h-full w-72 bg-zinc-900 border-r border-zinc-800 z-40 transform transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <NavContent />
      </aside>
    </>
  )
}
