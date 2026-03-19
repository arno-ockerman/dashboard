'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import {
  Flame, Users, Trophy, AlertCircle, CheckCircle2, XCircle,
  PauseCircle, Plus, RefreshCw, ChevronRight, Calendar,
  MessageCircle, Zap, BarChart3, Search, X, Clock, Star,
} from 'lucide-react'
import { format, differenceInDays, parseISO } from 'date-fns'
import { nl } from 'date-fns/locale'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Challenge {
  id: string
  name: string
  description?: string
  type: string
  start_date: string
  end_date: string
  status: 'draft' | 'active' | 'completed' | 'archived'
  target_count: number
  color: string
  days_elapsed: number
  days_remaining: number
  participant_count: number
  active_count: number
  completed_count: number
  dropped_count: number
  needs_checkin_count: number
}

interface Participant {
  id: string
  challenge_id: string
  client_id?: string
  name: string
  telegram?: string
  enrolled_at: string
  completed_at?: string
  last_checkin?: string
  current_day: number
  status: 'active' | 'completed' | 'dropped' | 'paused'
  checkin_streak: number
  total_checkins: number
  notes?: string
  client?: {
    id: string
    name: string
    email?: string
    telegram?: string
    status: string
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysSinceCheckin(lastCheckin?: string): number {
  if (!lastCheckin) return 999
  return differenceInDays(new Date(), parseISO(lastCheckin))
}

function checkinUrgency(p: Participant): 'ok' | 'warn' | 'alert' {
  if (p.status !== 'active') return 'ok'
  const days = daysSinceCheckin(p.last_checkin)
  if (days <= 1) return 'ok'
  if (days <= 3) return 'warn'
  return 'alert'
}

function progressPercent(p: Participant, target: number): number {
  return Math.min(100, Math.round((p.current_day / target) * 100))
}

const STATUS_COLORS = {
  active: 'text-emerald-400 bg-emerald-900/30 border-emerald-700/50',
  completed: 'text-amber-300 bg-amber-900/30 border-amber-700/50',
  dropped: 'text-red-400 bg-red-900/30 border-red-700/50',
  paused: 'text-zinc-400 bg-zinc-800 border-zinc-700',
}

const STATUS_ICONS = {
  active: <Flame className="w-3 h-3" />,
  completed: <Trophy className="w-3 h-3" />,
  dropped: <XCircle className="w-3 h-3" />,
  paused: <PauseCircle className="w-3 h-3" />,
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [selected, setSelected] = useState<Challenge | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [pLoading, setPLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'dropped' | 'alert'>('all')
  const [showNewChallenge, setShowNewChallenge] = useState(false)
  const [showAddParticipant, setShowAddParticipant] = useState(false)
  const [newChallenge, setNewChallenge] = useState({ name: '', description: '', start_date: format(new Date(), 'yyyy-MM-dd'), type: '21day' })
  const [newParticipant, setNewParticipant] = useState({ name: '', telegram: '' })
  const [checkingIn, setCheckingIn] = useState<string | null>(null)

  // ── Fetch challenges
  const fetchChallenges = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/challenges')
      const data = await res.json()
      setChallenges(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Fetch participants for selected challenge
  const fetchParticipants = useCallback(async (challengeId: string) => {
    setPLoading(true)
    try {
      const res = await fetch(`/api/challenges/${challengeId}/participants`)
      const data = await res.json()
      setParticipants(Array.isArray(data) ? data : [])
    } finally {
      setPLoading(false)
    }
  }, [])

  useEffect(() => { fetchChallenges() }, [fetchChallenges])
  useEffect(() => {
    if (selected) fetchParticipants(selected.id)
    else setParticipants([])
  }, [selected, fetchParticipants])

  // ── Check in participant
  const handleCheckin = async (participantId: string) => {
    if (!selected) return
    setCheckingIn(participantId)
    try {
      await fetch(`/api/challenges/${selected.id}/participants/${participantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'checkin' }),
      })
      await fetchParticipants(selected.id)
      await fetchChallenges()
    } finally {
      setCheckingIn(null)
    }
  }

  // ── Update participant status
  const handleStatusUpdate = async (participantId: string, status: string) => {
    if (!selected) return
    await fetch(`/api/challenges/${selected.id}/participants/${participantId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    fetchParticipants(selected.id)
    fetchChallenges()
  }

  // ── Create new challenge
  const handleCreateChallenge = async () => {
    if (!newChallenge.name || !newChallenge.start_date) return
    await fetch('/api/challenges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newChallenge),
    })
    setShowNewChallenge(false)
    setNewChallenge({ name: '', description: '', start_date: format(new Date(), 'yyyy-MM-dd'), type: '21day' })
    fetchChallenges()
  }

  // ── Add participant
  const handleAddParticipant = async () => {
    if (!newParticipant.name || !selected) return
    await fetch(`/api/challenges/${selected.id}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newParticipant),
    })
    setShowAddParticipant(false)
    setNewParticipant({ name: '', telegram: '' })
    fetchParticipants(selected.id)
    fetchChallenges()
  }

  // ── Filter participants
  const filteredParticipants = participants.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'all' ? true :
      filter === 'alert' ? checkinUrgency(p) === 'alert' :
      p.status === filter
    return matchSearch && matchFilter
  })

  // ── Stats for selected challenge
  const alertCount = participants.filter(p => checkinUrgency(p) === 'alert').length

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Flame className="w-8 h-8 text-orange-400" />
              Challenge Tracker
            </h1>
            <p className="text-zinc-400 mt-1">21-daagse transformatie challenges — real-time deelnemers overzicht</p>
          </div>
          <button
            onClick={() => setShowNewChallenge(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Nieuwe Challenge
          </button>
        </div>

        {/* Challenge Cards Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <RefreshCw className="w-6 h-6 animate-spin text-zinc-500" />
          </div>
        ) : challenges.length === 0 ? (
          <div className="text-center py-24 text-zinc-500">
            <Flame className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg">Nog geen challenges</p>
            <p className="text-sm mt-1">Maak je eerste 21-day challenge aan!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
            {challenges.map(c => (
              <button
                key={c.id}
                onClick={() => setSelected(selected?.id === c.id ? null : c)}
                className={`text-left p-5 rounded-xl border transition-all ${
                  selected?.id === c.id
                    ? 'border-emerald-500 bg-emerald-950/30 shadow-lg shadow-emerald-900/20'
                    : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                }`}
              >
                {/* Top row */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-white leading-tight">{c.name}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {format(parseISO(c.start_date), 'd MMM', { locale: nl })} → {format(parseISO(c.end_date), 'd MMM yyyy', { locale: nl })}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    c.status === 'active' ? 'text-emerald-400 bg-emerald-900/40 border-emerald-700/50' :
                    c.status === 'completed' ? 'text-amber-300 bg-amber-900/30 border-amber-700/40' :
                    'text-zinc-400 bg-zinc-800 border-zinc-700'
                  }`}>
                    {c.status === 'active' ? '🔥 Actief' : c.status === 'completed' ? '🏆 Klaar' : c.status}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-zinc-500 mb-1">
                    <span>Dag {Math.max(0, c.days_elapsed + 1)} / {c.target_count}</span>
                    <span>{Math.min(100, Math.round(((c.days_elapsed + 1) / c.target_count) * 100))}%</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, ((c.days_elapsed + 1) / c.target_count) * 100)}%`,
                        backgroundColor: c.color,
                      }}
                    />
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold text-white">{c.participant_count}</div>
                    <div className="text-[10px] text-zinc-500">Totaal</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-emerald-400">{c.active_count}</div>
                    <div className="text-[10px] text-zinc-500">Actief</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-amber-300">{c.completed_count}</div>
                    <div className="text-[10px] text-zinc-500">Klaar</div>
                  </div>
                  {c.needs_checkin_count > 0 ? (
                    <div>
                      <div className="text-lg font-bold text-red-400">{c.needs_checkin_count}</div>
                      <div className="text-[10px] text-red-500">⚠ Alert</div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-lg font-bold text-red-400">{c.dropped_count}</div>
                      <div className="text-[10px] text-zinc-500">Uitgevallen</div>
                    </div>
                  )}
                </div>

                {c.needs_checkin_count > 0 && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-orange-400 bg-orange-900/20 rounded-lg px-2.5 py-1.5 border border-orange-800/40">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    {c.needs_checkin_count} deelnemer{c.needs_checkin_count > 1 ? 's' : ''} heeft al 3+ dagen geen check-in
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* ── Participant Panel ─────────────────────────────────────────────── */}
        {selected && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            {/* Panel Header */}
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-900/30 border border-emerald-800/50">
                  <Users className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h2 className="font-semibold">{selected.name}</h2>
                  <p className="text-xs text-zinc-500">{participants.length} deelnemers</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { fetchParticipants(selected.id); fetchChallenges() }}
                  className="p-2 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
                >
                  <RefreshCw className={`w-4 h-4 ${pLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setShowAddParticipant(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Deelnemer
                </button>
              </div>
            </div>

            {/* Quick stats bar */}
            <div className="grid grid-cols-4 divide-x divide-zinc-800 border-b border-zinc-800">
              {[
                { label: 'Actief', value: participants.filter(p=>p.status==='active').length, color: 'text-emerald-400', icon: <Flame className="w-3.5 h-3.5" /> },
                { label: 'Voltooid', value: participants.filter(p=>p.status==='completed').length, color: 'text-amber-300', icon: <Trophy className="w-3.5 h-3.5" /> },
                { label: 'Uitgevallen', value: participants.filter(p=>p.status==='dropped').length, color: 'text-red-400', icon: <XCircle className="w-3.5 h-3.5" /> },
                { label: 'Check-in alert', value: alertCount, color: alertCount > 0 ? 'text-orange-400' : 'text-zinc-500', icon: <AlertCircle className="w-3.5 h-3.5" /> },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2 px-4 py-3">
                  <span className={s.color}>{s.icon}</span>
                  <div>
                    <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-[10px] text-zinc-500">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Search & Filter */}
            <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Zoek deelnemer..."
                  className="w-full pl-9 pr-4 py-2 bg-zinc-800 rounded-lg text-sm border border-zinc-700 focus:outline-none focus:border-emerald-600 placeholder-zinc-500"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="flex gap-1">
                {(['all', 'active', 'completed', 'dropped', 'alert'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      filter === f ? 'bg-emerald-700 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {f === 'all' ? 'Alles' : f === 'alert' ? `⚠ Alert (${alertCount})` :
                     f === 'active' ? '🔥 Actief' : f === 'completed' ? '🏆 Klaar' : '❌ Uitgevallen'}
                  </button>
                ))}
              </div>
            </div>

            {/* Participant List */}
            <div className="divide-y divide-zinc-800/60">
              {pLoading ? (
                <div className="flex items-center justify-center py-16">
                  <RefreshCw className="w-5 h-5 animate-spin text-zinc-500" />
                </div>
              ) : filteredParticipants.length === 0 ? (
                <div className="text-center py-16 text-zinc-500">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>Geen deelnemers gevonden</p>
                </div>
              ) : (
                filteredParticipants.map(p => {
                  const urgency = checkinUrgency(p)
                  const progress = progressPercent(p, selected.target_count)
                  const daysSince = daysSinceCheckin(p.last_checkin)
                  const isToday = p.last_checkin === format(new Date(), 'yyyy-MM-dd')

                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-4 px-5 py-4 hover:bg-zinc-800/30 transition-colors ${
                        urgency === 'alert' ? 'border-l-2 border-red-500/60' :
                        urgency === 'warn' ? 'border-l-2 border-orange-500/40' :
                        'border-l-2 border-transparent'
                      }`}
                    >
                      {/* Avatar / initial */}
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                        style={{ backgroundColor: `${selected.color}22`, color: selected.color }}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>

                      {/* Name + info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{p.name}</span>
                          <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full border ${STATUS_COLORS[p.status]}`}>
                            {STATUS_ICONS[p.status]}
                            {p.status === 'active' ? 'Actief' : p.status === 'completed' ? 'Voltooid' :
                             p.status === 'dropped' ? 'Uitgevallen' : 'Gepauzeerd'}
                          </span>
                          {p.checkin_streak >= 3 && (
                            <span className="text-[10px] text-orange-400 font-medium">🔥 {p.checkin_streak} streak</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          {/* Progress bar */}
                          <div className="flex items-center gap-1.5">
                            <div className="w-20 h-1 bg-zinc-700 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${progress}%`, backgroundColor: selected.color }}
                              />
                            </div>
                            <span className="text-xs text-zinc-400">Dag {p.current_day}/{selected.target_count}</span>
                          </div>
                          {/* Last check-in */}
                          {p.status === 'active' && (
                            <span className={`text-xs flex items-center gap-1 ${
                              urgency === 'alert' ? 'text-red-400' :
                              urgency === 'warn' ? 'text-orange-400' :
                              'text-zinc-500'
                            }`}>
                              <Clock className="w-3 h-3" />
                              {isToday ? '✓ Vandaag' :
                               p.last_checkin ? `${daysSince}d geleden` : 'Nog niet ingecheckt'}
                            </span>
                          )}
                          {p.telegram && (
                            <a
                              href={`https://t.me/${p.telegram.replace('@', '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                              onClick={e => e.stopPropagation()}
                            >
                              <MessageCircle className="w-3 h-3" /> TG
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Check-in button / stats */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right hidden sm:block">
                          <div className="text-xs text-zinc-500">{p.total_checkins} check-ins</div>
                          <div className="text-xs text-zinc-600">{progress}% klaar</div>
                        </div>

                        {p.status === 'active' && !isToday && (
                          <button
                            onClick={() => handleCheckin(p.id)}
                            disabled={checkingIn === p.id}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              urgency === 'alert'
                                ? 'bg-orange-600 hover:bg-orange-500 text-white'
                                : 'bg-zinc-700 hover:bg-emerald-700 text-zinc-300 hover:text-white'
                            }`}
                          >
                            {checkingIn === p.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                            Check-in
                          </button>
                        )}
                        {p.status === 'active' && isToday && (
                          <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-900/30 border border-emerald-800/50 px-2.5 py-1.5 rounded-lg">
                            <CheckCircle2 className="w-3 h-3" /> Gedaan
                          </span>
                        )}

                        {/* Status changer */}
                        {p.status === 'active' && (
                          <button
                            onClick={() => handleStatusUpdate(p.id, 'dropped')}
                            className="p-1.5 text-zinc-600 hover:text-red-400 transition-colors rounded"
                            title="Markeer als uitgevallen"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        {p.status === 'dropped' && (
                          <button
                            onClick={() => handleStatusUpdate(p.id, 'active')}
                            className="p-1.5 text-zinc-600 hover:text-emerald-400 transition-colors rounded"
                            title="Heractiveer deelnemer"
                          >
                            <Zap className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: New Challenge ─────────────────────────────────────────────── */}
      {showNewChallenge && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-400" /> Nieuwe Challenge
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Naam *</label>
                <input
                  value={newChallenge.name}
                  onChange={e => setNewChallenge(p => ({ ...p, name: e.target.value }))}
                  placeholder="21-Day Summer Challenge 2026"
                  className="w-full px-3 py-2 bg-zinc-800 rounded-lg text-sm border border-zinc-700 focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Beschrijving</label>
                <textarea
                  value={newChallenge.description}
                  onChange={e => setNewChallenge(p => ({ ...p, description: e.target.value }))}
                  placeholder="Shake, beweging, mindset — 21 dagen..."
                  rows={2}
                  className="w-full px-3 py-2 bg-zinc-800 rounded-lg text-sm border border-zinc-700 focus:outline-none focus:border-emerald-600 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Type</label>
                  <select
                    value={newChallenge.type}
                    onChange={e => setNewChallenge(p => ({ ...p, type: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-800 rounded-lg text-sm border border-zinc-700 focus:outline-none focus:border-emerald-600"
                  >
                    <option value="21day">21-Daags</option>
                    <option value="28day">28-Daags</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Startdatum *</label>
                  <input
                    type="date"
                    value={newChallenge.start_date}
                    onChange={e => setNewChallenge(p => ({ ...p, start_date: e.target.value }))}
                    className="w-full px-3 py-2 bg-zinc-800 rounded-lg text-sm border border-zinc-700 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNewChallenge(false)}
                className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={handleCreateChallenge}
                disabled={!newChallenge.name || !newChallenge.start_date}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
              >
                Aanmaken 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Add Participant ───────────────────────────────────────────── */}
      {showAddParticipant && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" /> Deelnemer Toevoegen
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Naam *</label>
                <input
                  value={newParticipant.name}
                  onChange={e => setNewParticipant(p => ({ ...p, name: e.target.value }))}
                  placeholder="Naam deelnemer"
                  className="w-full px-3 py-2 bg-zinc-800 rounded-lg text-sm border border-zinc-700 focus:outline-none focus:border-emerald-600"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Telegram handle</label>
                <input
                  value={newParticipant.telegram}
                  onChange={e => setNewParticipant(p => ({ ...p, telegram: e.target.value }))}
                  placeholder="@username"
                  className="w-full px-3 py-2 bg-zinc-800 rounded-lg text-sm border border-zinc-700 focus:outline-none focus:border-emerald-600"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddParticipant(false)}
                className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={handleAddParticipant}
                disabled={!newParticipant.name}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
              >
                Toevoegen ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
