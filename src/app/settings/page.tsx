'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import {
  Settings, Bot, Bell, Database, Github, Globe, Download,
  CheckCircle2, XCircle, RefreshCw, ExternalLink, Zap, Save,
  Users, ListTodo, Calendar,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SupabaseStatus {
  status: 'ok' | 'error' | 'checking'
  latency?: number
  message?: string
}

interface AgentModel {
  name: string
  emoji: string
  role: string
  model: string
  color: string
}

// ─── Config ───────────────────────────────────────────────────────────────────

const AGENTS: AgentModel[] = [
  { name: 'Jarvis', emoji: '🧠', role: 'Orchestrator', model: 'Claude Opus 4.6', color: 'text-brand-burgundy' },
  { name: 'Mike', emoji: '⚡', role: 'Developer', model: 'GPT-5.3 Codex (high reasoning)', color: 'text-blue-400' },
  { name: 'Kate', emoji: '✍️', role: 'Content', model: 'Claude Opus 4.6', color: 'text-pink-400' },
  { name: 'Steve', emoji: '🎨', role: 'UI/UX', model: 'Gemini 3.1 Pro', color: 'text-green-400' },
  { name: 'Alex', emoji: '🔍', role: 'Research', model: 'Gemini 2.5 Pro', color: 'text-amber-400' },
]

const QUICK_LINKS = [
  { label: 'GitHub Repository', icon: Github, href: 'https://github.com/arno-ockerman/dashboard', desc: 'dashboard main repo' },
  { label: 'Vercel Dashboard', icon: Globe, href: 'https://vercel.com/arno-ockerman', desc: 'auto-deploy from main' },
  { label: 'Supabase Console', icon: Database, href: 'https://supabase.com/dashboard/project/uldlxqyqmpjznmnokbjz', desc: 'database & tables' },
]

const EXPORTS = [
  { label: 'Klanten exporteren', icon: Users, type: 'clients', desc: 'Alle CRM klanten als CSV' },
  { label: 'Taken exporteren', icon: ListTodo, type: 'tasks', desc: 'AI team taken als CSV' },
  { label: 'Content exporteren', icon: Calendar, type: 'content', desc: 'Content posts als CSV' },
]

// ─── Supabase Status Card ─────────────────────────────────────────────────────

function SupabaseStatusCard() {
  const [status, setStatus] = useState<SupabaseStatus>({ status: 'checking' })

  const check = async () => {
    setStatus({ status: 'checking' })
    try {
      const res = await fetch('/api/supabase-status')
      const data = await res.json()
      setStatus(data)
    } catch {
      setStatus({ status: 'error', message: 'Connection failed' })
    }
  }

  useEffect(() => { check() }, [])

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-brand-green" />
          Supabase Status
        </h2>
        <button onClick={check} className="btn-ghost p-2" title="Opnieuw controleren">
          <RefreshCw className={`w-4 h-4 ${status.status === 'checking' ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex items-center gap-4">
        {status.status === 'checking' ? (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-zinc-600 animate-pulse" />
            <span className="text-zinc-400 text-sm">Verbinding testen...</span>
          </div>
        ) : status.status === 'ok' ? (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-400 text-sm font-medium">Verbonden</span>
            {status.latency && (
              <span className="text-zinc-500 text-xs">{status.latency}ms latency</span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-400 text-sm font-medium">Verbindingsfout</span>
            {status.message && <span className="text-zinc-500 text-xs">{status.message}</span>}
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-zinc-500">
        <div>
          <span className="text-zinc-600">Project URL</span>
          <p className="text-zinc-400 truncate">uldlxqyqmpjznmnokbjz.supabase.co</p>
        </div>
        <div>
          <span className="text-zinc-600">Regio</span>
          <p className="text-zinc-400">eu-west-1</p>
        </div>
      </div>
    </div>
  )
}

// ─── Team Models Card ─────────────────────────────────────────────────────────

function TeamModelsCard() {
  return (
    <div className="card">
      <h2 className="font-semibold text-white flex items-center gap-2 mb-4">
        <Bot className="w-4 h-4 text-brand-burgundy" />
        AI Team — Model Configuratie
      </h2>
      <div className="space-y-3">
        {AGENTS.map((agent) => (
          <div key={agent.name} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
            <span className="text-2xl w-8 text-center">{agent.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white text-sm">{agent.name}</span>
                <span className="text-xs text-zinc-600">{agent.role}</span>
              </div>
              <p className={`text-xs font-mono mt-0.5 ${agent.color}`}>{agent.model}</p>
            </div>
            <div className="flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-emerald-400" title="Actief" />
            </div>
          </div>
        ))}
      </div>
      <p className="text-zinc-600 text-xs mt-4">
        * Modellen worden geconfigureerd via OpenClaw / TOOLS.md. Pas aan via Jarvis (orchestrator).
      </p>
    </div>
  )
}

// ─── Notification Preferences ─────────────────────────────────────────────────

function NotificationCard() {
  const [prefs, setPrefs] = useState({
    telegram: true,
    daily_digest: true,
    task_complete: true,
    deploy_alerts: false,
    follow_up_reminders: true,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'notifications', value: prefs }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  const toggle = (key: keyof typeof prefs) => setPrefs({ ...prefs, [key]: !prefs[key] })

  const notifications = [
    { key: 'telegram' as const, label: 'Telegram Notificaties', desc: 'Ontvang updates via Telegram bot', icon: '✈️' },
    { key: 'daily_digest' as const, label: 'Dagelijkse Samenvatting', desc: 'Elke ochtend een overzicht van de dag', icon: '📊' },
    { key: 'task_complete' as const, label: 'Taak Voltooiing', desc: 'Melding wanneer een AI-agent een taak afrondt', icon: '✅' },
    { key: 'deploy_alerts' as const, label: 'Deploy Meldingen', desc: 'Vercel deploy success/failure', icon: '🚀' },
    { key: 'follow_up_reminders' as const, label: 'Follow-up Herinneringen', desc: 'Herinner me aan geplande klant follow-ups', icon: '🔔' },
  ]

  return (
    <div className="card">
      <h2 className="font-semibold text-white flex items-center gap-2 mb-4">
        <Bell className="w-4 h-4 text-amber-400" />
        Notificatie Voorkeuren
      </h2>
      <div className="space-y-3">
        {notifications.map(({ key, label, desc, icon }) => (
          <div key={key} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
            <div className="flex items-center gap-3">
              <span className="text-lg">{icon}</span>
              <div>
                <p className="text-sm text-white font-medium">{label}</p>
                <p className="text-xs text-zinc-500">{desc}</p>
              </div>
            </div>
            <button
              onClick={() => toggle(key)}
              className={`relative w-11 h-6 rounded-full transition-colors ${prefs[key] ? 'bg-brand-burgundy' : 'bg-zinc-700'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${prefs[key] ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="btn-primary mt-4 w-full justify-center"
      >
        {saved ? <><CheckCircle2 className="w-4 h-4" /> Opgeslagen!</> : saving ? 'Opslaan...' : <><Save className="w-4 h-4" /> Voorkeuren Opslaan</>}
      </button>
    </div>
  )
}

// ─── Quick Links Card ─────────────────────────────────────────────────────────

function QuickLinksCard() {
  return (
    <div className="card">
      <h2 className="font-semibold text-white flex items-center gap-2 mb-4">
        <ExternalLink className="w-4 h-4 text-blue-400" />
        Snelle Links
      </h2>
      <div className="space-y-2">
        {QUICK_LINKS.map(({ label, icon: Icon, href, desc }) => (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors group"
          >
            <Icon className="w-4 h-4 text-zinc-400 group-hover:text-white flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium">{label}</p>
              <p className="text-xs text-zinc-500">{desc}</p>
            </div>
            <ExternalLink className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400" />
          </a>
        ))}
      </div>
    </div>
  )
}

// ─── Export Data Card ─────────────────────────────────────────────────────────

function ExportCard() {
  const [downloading, setDownloading] = useState<string | null>(null)

  const download = async (type: string, label: string) => {
    setDownloading(type)
    try {
      const res = await fetch(`/api/export?type=${type}`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="card">
      <h2 className="font-semibold text-white flex items-center gap-2 mb-4">
        <Download className="w-4 h-4 text-brand-green" />
        Data Exporteren
      </h2>
      <div className="space-y-2">
        {EXPORTS.map(({ label, icon: Icon, type, desc }) => (
          <button
            key={type}
            onClick={() => download(type, label)}
            disabled={downloading === type}
            className="w-full flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors text-left group"
          >
            <Icon className="w-4 h-4 text-zinc-400 group-hover:text-white flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium">{label}</p>
              <p className="text-xs text-zinc-500">{desc}</p>
            </div>
            {downloading === type ? (
              <RefreshCw className="w-4 h-4 text-zinc-400 animate-spin" />
            ) : (
              <Download className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Dashboard Info Card ──────────────────────────────────────────────────────

function DashboardInfoCard() {
  return (
    <div className="card">
      <h2 className="font-semibold text-white flex items-center gap-2 mb-4">
        <Zap className="w-4 h-4 text-brand-amber" />
        Dashboard Info
      </h2>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="text-zinc-500">Versie</span>
          <span className="text-zinc-300 font-mono">Phase 2 — 2026-02-27</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Stack</span>
          <span className="text-zinc-300">Next.js 14 + Tailwind + Supabase</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Deployment</span>
          <span className="text-zinc-300">Vercel (auto via GitHub)</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Branch</span>
          <span className="text-zinc-300 font-mono">main</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-500">Brand</span>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#620E06]" title="Burgundy" />
            <div className="w-3 h-3 rounded-full bg-[#425C59]" title="Green" />
            <div className="w-3 h-3 rounded-full bg-[#D5CBBA]" title="Amber" />
          </div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-zinc-800">
        <p className="text-xs text-zinc-600 text-center">
          Gebouwd door Mike (AI Developer) voor Arno Ockerman · Make It Happen
        </p>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-3xl text-white tracking-widest uppercase"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            Instellingen
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Dashboard configuratie & team overzicht</p>
        </div>
        <Settings className="w-8 h-8 text-zinc-600" />
      </div>

      {/* Grid layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          <SupabaseStatusCard />
          <TeamModelsCard />
          <DashboardInfoCard />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <NotificationCard />
          <ExportCard />
          <QuickLinksCard />
        </div>
      </div>
    </div>
  )
}
