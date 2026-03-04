'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import {
  Lightbulb,
  RefreshCw,
  TrendingUp,
  FileText,
  Settings,
  Users,
  Brain,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Calendar,
  BarChart2,
  AlertTriangle,
  Zap,
  MessageSquare,
  Check,
  X,
  ThumbsUp,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BiReport {
  id: string
  report_date: string
  expert_name: string
  domain: string
  findings: string[]
  recommendations: string[]
  data_sources: string[]
  created_at: string
}

interface BiDigest {
  id: string
  digest_date: string
  summary: string
  ranked_recommendations: any[]
  expert_count: number
  status: 'generated' | 'reviewed' | 'actioned'
  feedback: any
  created_at: string
}

interface BiRecommendation {
  id: string
  digest_id: string
  rank: number
  title: string
  description: string
  expert_source: string
  domain: string
  impact: 'high' | 'medium' | 'low'
  effort: 'high' | 'medium' | 'low'
  status: 'proposed' | 'accepted' | 'rejected' | 'completed'
  feedback: string | null
  created_at: string
  updated_at: string
}

interface DigestData {
  digest: BiDigest | null
  recommendations: BiRecommendation[]
  reports: BiReport[]
}

// ─── Expert Config ─────────────────────────────────────────────────────────────

const EXPERT_CONFIG: Record<string, { color: string; bg: string; border: string; icon: any; emoji: string; description: string }> = {
  GrowthStrategist: {
    color: 'text-emerald-300',
    bg: 'bg-emerald-900/20',
    border: 'border-emerald-700/40',
    icon: TrendingUp,
    emoji: '📈',
    description: 'Lead generation & conversion analysis',
  },
  ContentStrategist: {
    color: 'text-purple-300',
    bg: 'bg-purple-900/20',
    border: 'border-purple-700/40',
    icon: FileText,
    emoji: '✍️',
    description: 'Content pipeline & publishing strategy',
  },
  OperationsAnalyst: {
    color: 'text-blue-300',
    bg: 'bg-blue-900/20',
    border: 'border-blue-700/40',
    icon: Settings,
    emoji: '⚙️',
    description: 'Task efficiency & team productivity',
  },
  ClientSuccessManager: {
    color: 'text-amber-300',
    bg: 'bg-amber-900/20',
    border: 'border-amber-700/40',
    icon: Users,
    emoji: '🤝',
    description: 'Client retention & relationship health',
  },
  Synthesizer: {
    color: 'text-rose-300',
    bg: 'bg-rose-900/20',
    border: 'border-rose-700/40',
    icon: Brain,
    emoji: '🧠',
    description: 'Cross-domain synthesis & top recommendations',
  },
}

const DOMAIN_CONFIG: Record<string, { color: string; bg: string }> = {
  Growth: { color: 'text-emerald-300', bg: 'bg-emerald-900/30' },
  Content: { color: 'text-purple-300', bg: 'bg-purple-900/30' },
  Operations: { color: 'text-blue-300', bg: 'bg-blue-900/30' },
  'Client Success': { color: 'text-amber-300', bg: 'bg-amber-900/30' },
  Strategy: { color: 'text-rose-300', bg: 'bg-rose-900/30' },
}

// ─── Badge Components ─────────────────────────────────────────────────────────

function ImpactBadge({ impact }: { impact: 'high' | 'medium' | 'low' }) {
  const config = {
    high: 'bg-red-900/40 text-red-300 border-red-700/50',
    medium: 'bg-amber-900/40 text-amber-300 border-amber-700/50',
    low: 'bg-green-900/40 text-green-300 border-green-700/50',
  }[impact]
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${config}`}>
      ↑ {impact} impact
    </span>
  )
}

function EffortBadge({ effort }: { effort: 'high' | 'medium' | 'low' }) {
  const config = {
    high: 'bg-red-900/30 text-red-400 border-red-800/50',
    medium: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    low: 'bg-green-900/30 text-green-400 border-green-800/50',
  }[effort]
  const label = { high: 'hard', medium: 'medium', low: 'easy' }[effort]
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${config}`}>
      ⚡ {label} effort
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, string> = {
    proposed: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    accepted: 'bg-green-900/40 text-green-300 border-green-700/50',
    rejected: 'bg-red-900/40 text-red-400 border-red-700/50',
    completed: 'bg-brand-burgundy/20 text-brand-amber border-brand-burgundy/40',
    generated: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    reviewed: 'bg-blue-900/30 text-blue-300 border-blue-700/40',
    actioned: 'bg-green-900/30 text-green-300 border-green-700/40',
  }
  const icons: Record<string, any> = {
    proposed: Clock,
    accepted: CheckCircle2,
    rejected: XCircle,
    completed: ThumbsUp,
  }
  const Icon = icons[status]
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1 w-fit ${config[status] ?? config.proposed}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {status}
    </span>
  )
}

// ─── Recommendation Card ──────────────────────────────────────────────────────

function RecommendationCard({
  rec,
  onUpdate,
}: {
  rec: BiRecommendation
  onUpdate: (id: string, update: { status: BiRecommendation['status']; feedback?: string }) => void
}) {
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackText, setFeedbackText] = useState(rec.feedback ?? '')
  const [saving, setSaving] = useState(false)

  const domainConfig = DOMAIN_CONFIG[rec.domain] ?? DOMAIN_CONFIG.Strategy

  const handleAction = async (status: BiRecommendation['status'], feedback?: string) => {
    setSaving(true)
    await onUpdate(rec.id, { status, feedback })
    setSaving(false)
    setShowFeedback(false)
  }

  const rankColor = ['', 'text-amber-300', 'text-zinc-300', 'text-zinc-400', 'text-zinc-500', 'text-zinc-600'][rec.rank] ?? 'text-zinc-600'

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all">
      <div className="flex items-start gap-4">
        {/* Rank */}
        <div className={`text-2xl font-bold font-bebas flex-shrink-0 w-8 text-center ${rankColor}`}>
          #{rec.rank}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start gap-2 mb-2">
            <h3 className="text-white font-semibold text-sm leading-snug flex-1 min-w-0">
              {rec.title}
            </h3>
            <StatusBadge status={rec.status} />
          </div>

          <p className="text-zinc-500 text-xs mb-3">{rec.description}</p>

          <div className="flex flex-wrap gap-2 mb-4">
            <span className={`text-xs px-2 py-0.5 rounded-full ${domainConfig.bg} ${domainConfig.color}`}>
              {rec.domain}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
              {rec.expert_source}
            </span>
            <ImpactBadge impact={rec.impact} />
            <EffortBadge effort={rec.effort} />
          </div>

          {rec.feedback && (
            <div className="bg-zinc-800/50 rounded-lg px-3 py-2 text-xs text-zinc-400 mb-3 italic">
              "{rec.feedback}"
            </div>
          )}

          {/* Action buttons */}
          {rec.status === 'proposed' && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleAction('accepted')}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-900/30 border border-green-700/40 text-green-300 text-xs font-medium hover:bg-green-900/50 transition-all disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                Accept
              </button>
              <button
                onClick={() => { setShowFeedback(true) }}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-900/20 border border-red-700/40 text-red-400 text-xs font-medium hover:bg-red-900/40 transition-all disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
                Reject
              </button>
              <button
                onClick={() => { setShowFeedback(true) }}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-burgundy/20 border border-brand-burgundy/40 text-brand-amber text-xs font-medium hover:bg-brand-burgundy/30 transition-all disabled:opacity-50"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                Complete
              </button>
            </div>
          )}

          {rec.status === 'accepted' && (
            <button
              onClick={() => handleAction('completed')}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-burgundy/20 border border-brand-burgundy/40 text-brand-amber text-xs font-medium hover:bg-brand-burgundy/30 transition-all disabled:opacity-50"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              Mark Complete
            </button>
          )}

          {/* Feedback form */}
          {showFeedback && (
            <div className="mt-3 space-y-2">
              <textarea
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
                placeholder="Optional feedback..."
                rows={2}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-600 resize-none focus:outline-none focus:border-zinc-600"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleAction('rejected', feedbackText || undefined)}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-lg bg-red-900/30 border border-red-700/40 text-red-300 text-xs font-medium hover:bg-red-900/50 transition-all"
                >
                  Confirm Reject
                </button>
                <button
                  onClick={() => handleAction('completed', feedbackText || undefined)}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-lg bg-green-900/30 border border-green-700/40 text-green-300 text-xs font-medium hover:bg-green-900/50 transition-all"
                >
                  Confirm Complete
                </button>
                <button
                  onClick={() => setShowFeedback(false)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 text-xs hover:bg-zinc-700 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Expert Card ──────────────────────────────────────────────────────────────

function ExpertCard({ report }: { report: BiReport }) {
  const [expanded, setExpanded] = useState(false)
  const config = EXPERT_CONFIG[report.expert_name] ?? EXPERT_CONFIG.Synthesizer
  const Icon = config.icon

  return (
    <div className={`${config.bg} border ${config.border} rounded-xl p-4 transition-all`}>
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg ${config.bg} border ${config.border} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-4 h-4 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`font-semibold text-sm ${config.color}`}>{report.expert_name}</div>
          <div className="text-zinc-500 text-xs">{config.description}</div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Key finding (always visible) */}
      {report.findings.length > 0 && (
        <p className="text-zinc-300 text-xs leading-relaxed">
          {report.findings[0]}
        </p>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 space-y-3">
          {report.findings.slice(1).length > 0 && (
            <div>
              <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1.5">Findings</p>
              <ul className="space-y-1">
                {report.findings.slice(1).map((f, i) => (
                  <li key={i} className="text-zinc-400 text-xs flex gap-2">
                    <span className="text-zinc-600 flex-shrink-0">•</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {report.recommendations.length > 0 && (
            <div>
              <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1.5">Recommendations</p>
              <ul className="space-y-1">
                {report.recommendations.map((r, i) => (
                  <li key={i} className="text-zinc-400 text-xs flex gap-2">
                    <span className={`${config.color} flex-shrink-0`}>→</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap gap-1 pt-1">
            {report.data_sources.map(s => (
              <span key={s} className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-600">{s}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── History Tab ──────────────────────────────────────────────────────────────

function HistoryTab() {
  const [digests, setDigests] = useState<BiDigest[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [selectedData, setSelectedData] = useState<DigestData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/bi/recommendations?limit=200')
      .then(r => r.json())
      .then(data => {
        // Group by digest date via a different endpoint — fetch all digests directly
      })
    // Fetch all digests via multiple calls — we use the main digest endpoint for now
    setLoading(false)
  }, [])

  // Simpler: fetch via supabase-exposed endpoint
  useEffect(() => {
    async function fetchDigests() {
      try {
        const res = await fetch('/api/bi/history')
        if (res.ok) {
          const data = await res.json()
          setDigests(data ?? [])
        }
      } catch (_) {}
      setLoading(false)
    }
    fetchDigests()
  }, [])

  const handleSelectDigest = async (id: string) => {
    setSelected(id)
    const res = await fetch(`/api/bi/digest/${id}`)
    const data = await res.json()
    setSelectedData(data)
  }

  const calcStats = (recs: BiRecommendation[]) => ({
    total: recs.length,
    accepted: recs.filter(r => r.status === 'accepted').length,
    rejected: recs.filter(r => r.status === 'rejected').length,
    completed: recs.filter(r => r.status === 'completed').length,
    proposed: recs.filter(r => r.status === 'proposed').length,
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="w-5 h-5 text-zinc-600 animate-spin" />
      </div>
    )
  }

  if (digests.length === 0) {
    return (
      <div className="text-center py-16">
        <Calendar className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
        <p className="text-zinc-500 text-sm">No history yet. Run an analysis to get started.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Digest list */}
      <div className="space-y-2">
        <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3">Past Analyses</h3>
        {digests.map(d => (
          <button
            key={d.id}
            onClick={() => handleSelectDigest(d.id)}
            className={`w-full text-left p-3 rounded-lg border transition-all ${
              selected === d.id
                ? 'bg-brand-burgundy/20 border-brand-burgundy/40 text-white'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white'
            }`}
          >
            <div className="font-medium text-sm">
              {format(parseISO(d.digest_date), 'EEE, MMM d yyyy')}
            </div>
            <div className="text-xs mt-0.5 opacity-60">
              {d.expert_count} experts · <StatusBadge status={d.status} />
            </div>
          </button>
        ))}
      </div>

      {/* Selected digest detail */}
      <div className="lg:col-span-2">
        {selectedData ? (
          <div className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-2">
                {format(parseISO(selectedData.digest!.digest_date), 'MMMM d, yyyy')}
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{selectedData.digest!.summary}</p>

              {/* Stats */}
              {(() => {
                const stats = calcStats(selectedData.recommendations)
                const acceptRate = stats.total > 0 ? Math.round(((stats.accepted + stats.completed) / stats.total) * 100) : 0
                return (
                  <div className="grid grid-cols-4 gap-3 mt-4">
                    {[
                      { label: 'Accepted', value: stats.accepted, color: 'text-green-300' },
                      { label: 'Completed', value: stats.completed, color: 'text-brand-amber' },
                      { label: 'Rejected', value: stats.rejected, color: 'text-red-400' },
                      { label: 'Accept Rate', value: `${acceptRate}%`, color: 'text-white' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="text-center p-3 bg-zinc-800/50 rounded-lg">
                        <div className={`text-lg font-bold ${color}`}>{value}</div>
                        <div className="text-zinc-600 text-xs">{label}</div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>

            <div className="space-y-3">
              {selectedData.recommendations.map(rec => (
                <div key={rec.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-zinc-600 font-bold text-lg font-bebas w-6 text-center">#{rec.rank}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white text-sm font-medium">{rec.title}</span>
                        <StatusBadge status={rec.status} />
                      </div>
                      <div className="flex gap-2 mt-2">
                        <ImpactBadge impact={rec.impact} />
                        <EffortBadge effort={rec.effort} />
                      </div>
                      {rec.feedback && (
                        <p className="text-zinc-500 text-xs mt-2 italic">"{rec.feedback}"</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full py-16 text-zinc-600">
            <div className="text-center">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Select a date to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const [tab, setTab] = useState<'today' | 'history'>('today')
  const [data, setData] = useState<DigestData>({ digest: null, recommendations: [], reports: [] })
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const fetchLatest = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/bi/digest')
      const json = await res.json()
      setData(json)
    } catch (e) {
      setError('Failed to load latest digest')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLatest()
  }, [fetchLatest])

  const runAnalysis = async () => {
    setAnalyzing(true)
    setError(null)
    setStatusMsg('Running BI Council analysis...')
    try {
      const res = await fetch('/api/bi/analyze', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setStatusMsg(`✅ Analysis complete — ${json.recommendations} recommendations generated`)
      await fetchLatest()
    } catch (e: any) {
      setError(e.message ?? 'Analysis failed')
    } finally {
      setAnalyzing(false)
      setTimeout(() => setStatusMsg(null), 5000)
    }
  }

  const handleUpdateRec = async (id: string, update: { status: BiRecommendation['status']; feedback?: string }) => {
    const res = await fetch(`/api/bi/recommendations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    })
    if (res.ok) {
      setData(prev => ({
        ...prev,
        recommendations: prev.recommendations.map(r =>
          r.id === id ? { ...r, ...update, feedback: update.feedback ?? r.feedback } : r
        ),
      }))
    }
  }

  const filteredRecs = filterStatus === 'all'
    ? data.recommendations
    : data.recommendations.filter(r => r.status === filterStatus)

  const expertReports = data.reports.filter(r => r.expert_name !== 'Synthesizer')
  const synthesizer = data.reports.find(r => r.expert_name === 'Synthesizer')

  const stats = {
    accepted: data.recommendations.filter(r => r.status === 'accepted').length,
    rejected: data.recommendations.filter(r => r.status === 'rejected').length,
    completed: data.recommendations.filter(r => r.status === 'completed').length,
    proposed: data.recommendations.filter(r => r.status === 'proposed').length,
  }
  const acceptRate = data.recommendations.length > 0
    ? Math.round(((stats.accepted + stats.completed) / data.recommendations.length) * 100)
    : 0

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-burgundy/20 border border-brand-burgundy/40 rounded-xl flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-brand-amber" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white font-bebas tracking-wide">BI COUNCIL</h1>
              <p className="text-zinc-500 text-sm">Business Intelligence Advisory Engine</p>
            </div>
          </div>
        </div>

        <button
          onClick={runAnalysis}
          disabled={analyzing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-burgundy hover:bg-brand-burgundy-light text-white font-medium text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-brand-burgundy/20"
        >
          {analyzing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Zap className="w-4 h-4" />
          )}
          {analyzing ? 'Analyzing...' : 'Run Analysis'}
        </button>
      </div>

      {/* Status messages */}
      {statusMsg && (
        <div className="bg-brand-green/10 border border-brand-green/30 rounded-xl px-4 py-3 text-sm text-white flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
          {statusMsg}
        </div>
      )}
      {error && (
        <div className="bg-red-900/20 border border-red-700/40 rounded-xl px-4 py-3 text-sm text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 w-fit">
        {[
          { id: 'today', label: 'Today\'s Analysis', icon: Brain },
          { id: 'history', label: 'History', icon: Calendar },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === id
                ? 'bg-brand-burgundy/20 border border-brand-burgundy/40 text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'today' && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-5 h-5 text-zinc-600 animate-spin" />
            </div>
          ) : !data.digest ? (
            <div className="text-center py-16 bg-zinc-900 border border-zinc-800 rounded-2xl">
              <Brain className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <h2 className="text-white font-semibold mb-2">No Analysis Yet</h2>
              <p className="text-zinc-500 text-sm mb-6 max-w-md mx-auto">
                The BI Council hasn't run today. Click "Run Analysis" to get your first batch of strategic recommendations.
              </p>
              <button
                onClick={runAnalysis}
                disabled={analyzing}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-burgundy text-white font-medium hover:bg-brand-burgundy-light transition-all disabled:opacity-60"
              >
                <Zap className="w-4 h-4" />
                Run First Analysis
              </button>
            </div>
          ) : (
            <>
              {/* Digest summary card */}
              <div className="bg-gradient-to-br from-brand-burgundy/10 to-brand-green/5 border border-brand-burgundy/20 rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                      {format(parseISO(data.digest.digest_date), 'EEEE, MMMM d yyyy')}
                    </div>
                    <h2 className="text-xl font-bold text-white font-bebas tracking-wide">NIGHTLY DIGEST</h2>
                  </div>
                  <StatusBadge status={data.digest.status} />
                </div>
                <p className="text-zinc-300 text-sm leading-relaxed mb-5">{data.digest.summary}</p>

                {/* Quick stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Proposed', value: stats.proposed, color: 'text-zinc-300', bg: 'bg-zinc-800/80' },
                    { label: 'Accepted', value: stats.accepted, color: 'text-green-300', bg: 'bg-green-900/30' },
                    { label: 'Completed', value: stats.completed, color: 'text-brand-amber', bg: 'bg-brand-burgundy/20' },
                    { label: 'Accept Rate', value: `${acceptRate}%`, color: 'text-white', bg: 'bg-zinc-800/80' },
                  ].map(({ label, value, color, bg }) => (
                    <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
                      <div className={`text-xl font-bold ${color}`}>{value}</div>
                      <div className="text-zinc-500 text-xs mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expert cards */}
              <div>
                <h2 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3">Expert Analysis</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {expertReports.map(report => (
                    <ExpertCard key={report.id} report={report} />
                  ))}
                  {synthesizer && <ExpertCard report={synthesizer} />}
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                  <h2 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                    Ranked Recommendations ({filteredRecs.length})
                  </h2>
                  {/* Filter */}
                  <div className="flex gap-1.5 flex-wrap">
                    {['all', 'proposed', 'accepted', 'rejected', 'completed'].map(s => (
                      <button
                        key={s}
                        onClick={() => setFilterStatus(s)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          filterStatus === s
                            ? 'bg-brand-burgundy/30 border border-brand-burgundy/40 text-white'
                            : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300 border border-transparent'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredRecs.length === 0 ? (
                  <div className="text-center py-10 bg-zinc-900 border border-zinc-800 rounded-xl">
                    <MessageSquare className="w-6 h-6 text-zinc-700 mx-auto mb-2" />
                    <p className="text-zinc-500 text-sm">No recommendations with this status</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredRecs.map(rec => (
                      <RecommendationCard key={rec.id} rec={rec} onUpdate={handleUpdateRec} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'history' && <HistoryTab />}
    </div>
  )
}
