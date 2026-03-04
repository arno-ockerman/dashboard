'use client'

import { useState } from 'react'
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
  ListTodo,
  Folder,
  FolderOpen,
  FileText,
  Settings,
  Bot,
  Upload,
  Lightbulb,
} from 'lucide-react'

const NAV_SECTIONS = [
  {
    label: 'Workspace',
    links: [
      { href: '/', label: 'Command Center', icon: LayoutDashboard },
      { href: '/focus', label: 'Big 3 Focus', icon: Crosshair },
    ],
  },
  {
    label: 'AI Team',
    links: [
      { href: '/team', label: 'Team', icon: Bot },
      { href: '/tasks', label: 'Task Board', icon: ListTodo },
      { href: '/projects', label: 'Projects', icon: Folder },
    ],
  },
  {
    label: 'Business',
    links: [
      { href: '/sales', label: 'Sales', icon: DollarSign },
      { href: '/usage', label: 'Usage', icon: BarChart2 },
      { href: '/clients', label: 'Clients', icon: Users },
      { href: '/content', label: 'Content', icon: Calendar },
      { href: '/goals', label: 'Goals & Habits', icon: Target },
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
      { href: '/settings', label: 'Instellingen', icon: Settings },
    ],
  },
]

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

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
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-burgundy" />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

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
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white"
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
        className={`lg:hidden fixed top-0 left-0 h-full w-72 bg-zinc-900 border-r border-zinc-800 z-40 transform transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <NavContent />
      </aside>
    </>
  )
}
