'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  Plus, Search, Users, X, Upload, FileText, Check,
  RefreshCw, ChevronDown, Tag, Filter, Download,
} from 'lucide-react'
import { format } from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────

type ClientStatus = 'lead' | 'prospect' | 'active' | 'vip' | 'inactive'
type SortKey = 'name' | 'status' | 'source' | 'created_at'

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

interface ImportRow {
  name: string
  email?: string
  phone?: string
  source?: string
  status?: string
  tags?: string[]
  notes?: string
}

interface ImportResult {
  created: number
  updated: number
  unchanged: number
  errors: string[]
  details: Array<{ name: string; action: 'created' | 'updated' | 'unchanged'; email?: string }>
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ClientStatus, { label: string; color: string; bg: string; emoji: string }> = {
  lead: { label: 'Lead', color: 'text-zinc-300', bg: 'bg-zinc-700', emoji: '🎯' },
  prospect: { label: 'Prospect', color: 'text-blue-300', bg: 'bg-blue-900/50', emoji: '👀' },
  active: { label: 'Actieve Klant', color: 'text-green-300', bg: 'bg-green-900/50', emoji: '✅' },
  vip: { label: 'VIP', color: 'text-amber-300', bg: 'bg-amber-900/40', emoji: '⭐' },
  inactive: { label: 'Inactief', color: 'text-zinc-500', bg: 'bg-zinc-800', emoji: '💤' },
}

const PIPELINE_ORDER: ClientStatus[] = ['lead', 'prospect', 'active', 'vip', 'inactive']

const TAGS_PRESETS = [
  'mealplanner-lead',
  'challenge-deelnemer',
  'herbalife-klant',
  'bizworks-import',
  'follow-up-nodig',
  'newsletter',
]

const SOURCES = ['instagram', 'facebook', 'telegram', 'referral', 'website', 'challenge', 'bizworks', 'manual', 'other']

// ─── CSV Parser ───────────────────────────────────────────────────────────────

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase())

  return lines.slice(1).map((line) => {
    const values: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuotes = !inQuotes
      } else if (line[i] === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += line[i]
      }
    }
    values.push(current.trim())

    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] || '' })
    return row
  })
}

// ─── Map CSV column to client field ──────────────────────────────────────────

function detectMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {}
  const namePatterns = ['name', 'naam', 'voornaam', 'fullname', 'klant']
  const emailPatterns = ['email', 'e-mail', 'mail']
  const phonePatterns = ['phone', 'telefoon', 'tel', 'mobile', 'gsm']
  const sourcePatterns = ['source', 'bron', 'herkomst']
  const statusPatterns = ['status']
  const notesPatterns = ['notes', 'notities', 'opmerkingen', 'remarks']

  headers.forEach((h) => {
    const lh = h.toLowerCase()
    if (namePatterns.some((p) => lh.includes(p))) mapping['name'] = h
    else if (emailPatterns.some((p) => lh.includes(p))) mapping['email'] = h
    else if (phonePatterns.some((p) => lh.includes(p))) mapping['phone'] = h
    else if (sourcePatterns.some((p) => lh.includes(p))) mapping['source'] = h
    else if (statusPatterns.some((p) => lh.includes(p))) mapping['status'] = h
    else if (notesPatterns.some((p) => lh.includes(p))) mapping['notes'] = h
  })

  return mapping
}

// ─── CSV Import Modal ─────────────────────────────────────────────────────────

function CSVImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'result'>('upload')
  const [dragging, setDragging] = useState(false)
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const rows = parseCSV(text)
        if (!rows.length) { setError('Geen geldige rijen gevonden'); return }
        const hdrs = Object.keys(rows[0])
        setHeaders(hdrs)
        setCsvRows(rows)
        setMapping(detectMapping(hdrs))
        setStep('preview')
      } catch (err) {
        setError(`CSV fout: ${err}`)
      }
    }
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const buildImportRows = (): ImportRow[] => {
    return csvRows.map((row) => ({
      name: mapping['name'] ? row[mapping['name']] : '',
      email: mapping['email'] ? row[mapping['email']] : undefined,
      phone: mapping['phone'] ? row[mapping['phone']] : undefined,
      source: mapping['source'] ? (row[mapping['source']] || 'bizworks-import') : 'bizworks-import',
      status: mapping['status'] ? (row[mapping['status']] || 'lead') : 'lead',
      notes: mapping['notes'] ? row[mapping['notes']] : undefined,
      tags: ['bizworks-import'],
    })).filter((r) => r.name.trim())
  }

  const doImport = async () => {
    setImporting(true)
    setStep('importing')
    try {
      const rows = buildImportRows()
      const res = await fetch('/api/clients/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      const data: ImportResult = await res.json()
      setResult(data)
      setStep('result')
    } catch (err) {
      setError(String(err))
      setStep('preview')
    } finally {
      setImporting(false)
    }
  }

  const FIELDS = ['name', 'email', 'phone', 'source', 'status', 'notes']

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-brand-green" /> CSV / BizWorks Import
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Step: Upload */}
        {step === 'upload' && (
          <div>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                dragging ? 'border-brand-green bg-brand-green/10' : 'border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800/30'
              }`}
            >
              <FileText className={`w-12 h-12 mx-auto mb-4 ${dragging ? 'text-brand-green' : 'text-zinc-600'}`} />
              <p className="text-white font-medium mb-2">Sleep je CSV/Excel bestand hier</p>
              <p className="text-zinc-500 text-sm">of klik om te bladeren</p>
              <p className="text-zinc-600 text-xs mt-3">CSV, Excel (.xlsx wordt niet direct ondersteund — exporteer als CSV)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
              />
            </div>
            {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
            <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg">
              <p className="text-xs text-zinc-500 font-medium mb-1">💡 Tip: BizWorks Export</p>
              <p className="text-xs text-zinc-600">Exporteer je BizWorks contacten als CSV. Kolommen die herkend worden: naam, email, telefoon, bron, status, notities</p>
            </div>
          </div>
        )}

        {/* Step: Preview & Column Mapping */}
        {step === 'preview' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-zinc-400">{csvRows.length} rijen gevonden in CSV</p>
              <button onClick={() => setStep('upload')} className="text-xs text-zinc-500 hover:text-white">← Ander bestand</button>
            </div>

            {/* Column mapping */}
            <div className="card mb-4">
              <h3 className="text-sm font-semibold text-white mb-3">Kolom Mapping</h3>
              <div className="grid grid-cols-2 gap-3">
                {FIELDS.map((field) => (
                  <div key={field}>
                    <label className="block text-xs text-zinc-500 mb-1 capitalize">{field}</label>
                    <select
                      value={mapping[field] || ''}
                      onChange={(e) => setMapping({ ...mapping, [field]: e.target.value || '' })}
                      className="select text-xs"
                    >
                      <option value="">— Niet importeren —</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview rows */}
            <div className="card mb-4 overflow-x-auto">
              <h3 className="text-sm font-semibold text-white mb-3">Voorbeeld (eerste 5 rijen)</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-zinc-500 border-b border-zinc-800">
                    <th className="text-left py-1.5 pr-3">Naam</th>
                    <th className="text-left py-1.5 pr-3">Email</th>
                    <th className="text-left py-1.5 pr-3">Telefoon</th>
                    <th className="text-left py-1.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {buildImportRows().slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-b border-zinc-800/50">
                      <td className="py-1.5 pr-3 text-white">{row.name || '—'}</td>
                      <td className="py-1.5 pr-3 text-zinc-400">{row.email || '—'}</td>
                      <td className="py-1.5 pr-3 text-zinc-400">{row.phone || '—'}</td>
                      <td className="py-1.5">
                        <span className="badge bg-zinc-800 text-zinc-400">{row.status || 'lead'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {csvRows.length > 5 && (
                <p className="text-zinc-600 text-xs mt-2">... en {csvRows.length - 5} meer rijen</p>
              )}
            </div>

            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

            <div className="flex gap-3">
              <button onClick={onClose} className="btn-secondary flex-1 justify-center">Annuleren</button>
              <button
                onClick={doImport}
                disabled={!mapping['name']}
                className="btn-primary flex-1 justify-center"
              >
                {buildImportRows().length} Klanten Importeren →
              </button>
            </div>
          </div>
        )}

        {/* Step: Importing */}
        {step === 'importing' && (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 text-brand-green animate-spin mx-auto mb-4" />
            <p className="text-white font-medium">Importeren...</p>
            <p className="text-zinc-500 text-sm mt-2">Even geduld, bezig met importeren</p>
          </div>
        )}

        {/* Step: Result */}
        {step === 'result' && result && (
          <div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="card text-center py-4">
                <div className="text-2xl font-bold text-emerald-400">{result.created}</div>
                <div className="text-xs text-zinc-500 mt-1">Nieuw aangemaakt</div>
              </div>
              <div className="card text-center py-4">
                <div className="text-2xl font-bold text-blue-400">{result.updated}</div>
                <div className="text-xs text-zinc-500 mt-1">Bijgewerkt</div>
              </div>
              <div className="card text-center py-4">
                <div className="text-2xl font-bold text-zinc-400">{result.unchanged}</div>
                <div className="text-xs text-zinc-500 mt-1">Ongewijzigd</div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="card mb-4 border-red-900/50">
                <p className="text-sm font-semibold text-red-400 mb-2">Fouten ({result.errors.length})</p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-400/70">{e}</p>
                  ))}
                </div>
              </div>
            )}

            {result.details.length > 0 && (
              <div className="card mb-4 max-h-48 overflow-y-auto">
                <p className="text-xs font-semibold text-zinc-400 mb-2">Details</p>
                <div className="space-y-1">
                  {result.details.slice(0, 20).map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className={
                        d.action === 'created' ? 'text-emerald-400' :
                        d.action === 'updated' ? 'text-blue-400' : 'text-zinc-500'
                      }>
                        {d.action === 'created' ? '+ ' : d.action === 'updated' ? '↑ ' : '= '}
                      </span>
                      <span className="text-white">{d.name}</span>
                      {d.email && <span className="text-zinc-600">{d.email}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => { onDone(); onClose() }}
              className="btn-primary w-full justify-center"
            >
              <Check className="w-4 h-4" /> Gereed
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Add/Edit Client Modal ────────────────────────────────────────────────────

interface ClientForm {
  name: string
  email: string
  phone: string
  telegram: string
  status: ClientStatus
  source: string
  notes: string
  next_follow_up: string
  next_action: string
  tags: string[]
}

const defaultForm: ClientForm = {
  name: '', email: '', phone: '', telegram: '',
  status: 'lead', source: 'instagram', notes: '',
  next_follow_up: '', next_action: '',
  tags: [],
}

function ClientModal({
  form,
  onChange,
  onSave,
  onClose,
  saving,
  editMode,
}: {
  form: ClientForm
  onChange: (f: ClientForm) => void
  onSave: () => void
  onClose: () => void
  saving: boolean
  editMode: boolean
}) {
  const toggleTag = (tag: string) => {
    const t = form.tags.includes(tag) ? form.tags.filter((x) => x !== tag) : [...form.tags, tag]
    onChange({ ...form, tags: t })
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">{editMode ? 'Klant Bewerken' : 'Klant Toevoegen'}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Naam *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => onChange({ ...form, name: e.target.value })}
              placeholder="Volledige naam"
              className="input"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(e) => onChange({ ...form, status: e.target.value as ClientStatus })}
                className="select"
              >
                {PIPELINE_ORDER.map((s) => (
                  <option key={s} value={s}>{STATUS_CONFIG[s].emoji} {STATUS_CONFIG[s].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Bron</label>
              <select
                value={form.source}
                onChange={(e) => onChange({ ...form, source: e.target.value })}
                className="select"
              >
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => onChange({ ...form, email: e.target.value })}
                placeholder="email@example.com"
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Telefoon</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => onChange({ ...form, phone: e.target.value })}
                placeholder="+32..."
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Telegram</label>
            <input
              type="text"
              value={form.telegram}
              onChange={(e) => onChange({ ...form, telegram: e.target.value })}
              placeholder="@username"
              className="input"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {TAGS_PRESETS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`badge cursor-pointer transition-colors ${
                    form.tags.includes(tag)
                      ? 'bg-brand-green/30 text-brand-green border border-brand-green/40'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {form.tags.includes(tag) && <Check className="w-2.5 h-2.5 mr-1" />}
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Volgende Actie</label>
            <input
              type="text"
              value={form.next_action}
              onChange={(e) => onChange({ ...form, next_action: e.target.value })}
              placeholder="Wat is de volgende stap?"
              className="input"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Follow-up Datum</label>
            <input
              type="date"
              value={form.next_follow_up}
              onChange={(e) => onChange({ ...form, next_follow_up: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Notities</label>
            <textarea
              value={form.notes}
              onChange={(e) => onChange({ ...form, notes: e.target.value })}
              placeholder="Notities over deze klant..."
              rows={3}
              className="input resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">Annuleren</button>
            <button
              onClick={onSave}
              disabled={!form.name || saving}
              className="btn-primary flex-1 justify-center"
            >
              {saving ? 'Opslaan...' : editMode ? 'Bijwerken' : 'Toevoegen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterSource, setFilterSource] = useState<string>('all')
  const [filterTag, setFilterTag] = useState<string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [showModal, setShowModal] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [form, setForm] = useState<ClientForm>({ ...defaultForm })
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const fetchClients = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus !== 'all') params.set('status', filterStatus)
      if (search) params.set('search', search)
      const res = await fetch(`/api/clients?${params}`)
      const data = await res.json()
      setClients(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }, [filterStatus, search])

  useEffect(() => {
    const timer = setTimeout(fetchClients, 300)
    return () => clearTimeout(timer)
  }, [fetchClients])

  // Client-side filtering for tags and source
  const filteredClients = clients
    .filter((c) => filterSource === 'all' || c.source === filterSource)
    .filter((c) => filterTag === 'all' || c.tags?.includes(filterTag))
    .sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name)
      if (sortKey === 'status') return PIPELINE_ORDER.indexOf(a.status) - PIPELINE_ORDER.indexOf(b.status)
      if (sortKey === 'source') return (a.source || '').localeCompare(b.source || '')
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  // All tags used across clients
  const allTags = Array.from(new Set(clients.flatMap((c) => c.tags || [])))
  const allSources = Array.from(new Set(clients.map((c) => c.source).filter(Boolean)))

  // Pipeline stats
  const pipeline = PIPELINE_ORDER.map((s) => ({
    status: s,
    count: clients.filter((c) => c.status === s).length,
  }))

  const openAdd = () => {
    setEditingId(null)
    setForm({ ...defaultForm })
    setShowModal(true)
  }

  const openEdit = (client: Client) => {
    setEditingId(client.id)
    setForm({
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      telegram: client.telegram || '',
      status: client.status as ClientStatus,
      source: client.source || 'other',
      notes: client.notes || '',
      next_follow_up: client.next_follow_up || '',
      next_action: client.next_action || '',
      tags: client.tags || [],
    })
    setShowModal(true)
  }

  const saveClient = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        next_follow_up: form.next_follow_up || null,
        last_contact: new Date().toISOString(),
      }

      if (editingId) {
        const res = await fetch(`/api/clients/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) { setShowModal(false); fetchClients() }
      } else {
        const res = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) { setShowModal(false); setForm({ ...defaultForm }); fetchClients() }
      }
    } finally {
      setSaving(false)
    }
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
            CRM — Klanten
          </h1>
          <p className="text-zinc-400 text-sm mt-1">{clients.length} contacten in pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open('/api/export?type=clients', '_blank')}
            className="btn-ghost"
            title="Exporteer als CSV"
          >
            <Download className="w-4 h-4" />
          </button>
          <button onClick={() => setShowImport(true)} className="btn-secondary">
            <Upload className="w-4 h-4" /> Import CSV
          </button>
          <button onClick={openAdd} className="btn-primary">
            <Plus className="w-4 h-4" /> Klant Toevoegen
          </button>
        </div>
      </div>

      {/* Pipeline cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
        {pipeline.map(({ status, count }) => {
          const cfg = STATUS_CONFIG[status]
          return (
            <button
              key={status}
              onClick={() => setFilterStatus(filterStatus === status ? 'all' : status)}
              className={`card text-center hover:border-zinc-600 transition-all cursor-pointer py-4 ${
                filterStatus === status ? 'border-brand-burgundy/60 bg-brand-burgundy/5' : ''
              }`}
            >
              <div className="text-2xl mb-1">{cfg.emoji}</div>
              <div className={`text-2xl font-bold ${cfg.color}`}>{count}</div>
              <div className="text-xs text-zinc-500 mt-1">{cfg.label}s</div>
            </button>
          )
        })}
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Zoek op naam, email, telefoon..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="select sm:w-40"
        >
          <option value="all">Alle statussen</option>
          {PIPELINE_ORDER.map((s) => (
            <option key={s} value={s}>{STATUS_CONFIG[s].emoji} {STATUS_CONFIG[s].label}</option>
          ))}
        </select>
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className="select sm:w-36"
        >
          <option value="all">Alle bronnen</option>
          {allSources.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {allTags.length > 0 && (
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="select sm:w-40"
          >
            <option value="all">Alle tags</option>
            {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="select sm:w-36"
        >
          <option value="created_at">Nieuwste eerst</option>
          <option value="name">A → Z</option>
          <option value="status">Pipeline</option>
          <option value="source">Bron</option>
        </select>
      </div>

      {/* Client list */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="card skeleton h-20" />)}
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="card text-center py-16">
          <Users className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-400 text-lg font-medium mb-2">Geen klanten gevonden</p>
          <p className="text-zinc-600 text-sm mb-6">
            {search || filterStatus !== 'all' ? 'Pas je filters aan' : 'Voeg je eerste klant toe of importeer via CSV'}
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={openAdd} className="btn-primary">
              <Plus className="w-4 h-4" /> Klant Toevoegen
            </button>
            <button onClick={() => setShowImport(true)} className="btn-secondary">
              <Upload className="w-4 h-4" /> Import CSV
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredClients.map((client) => {
            const cfg = STATUS_CONFIG[client.status] || STATUS_CONFIG.lead
            return (
              <div
                key={client.id}
                className="card-hover flex items-center gap-4"
                onClick={() => openEdit(client)}
              >
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0 text-lg`}
                  style={{ background: 'rgba(66,92,89,0.2)', color: '#425C59' }}>
                  {client.name[0].toUpperCase()}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-white">{client.name}</span>
                    <span className={`badge ${cfg.bg} ${cfg.color} text-xs`}>
                      {cfg.emoji} {cfg.label}
                    </span>
                    {(client.tags || []).slice(0, 2).map((tag) => (
                      <span key={tag} className="badge bg-zinc-800 text-zinc-400 text-xs">{tag}</span>
                    ))}
                    {(client.tags || []).length > 2 && (
                      <span className="text-xs text-zinc-600">+{client.tags.length - 2}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-zinc-500 flex-wrap">
                    {client.phone && <span>📞 {client.phone}</span>}
                    {client.email && <span>✉️ {client.email}</span>}
                    {client.telegram && <span>✈️ {client.telegram}</span>}
                    {client.source && <span className="text-zinc-600">via {client.source}</span>}
                  </div>
                  {client.next_action && (
                    <p className="text-xs text-amber-400 mt-1">→ {client.next_action}</p>
                  )}
                </div>

                {/* Dates */}
                <div className="flex-shrink-0 text-right">
                  {client.next_follow_up && (
                    <div className={`text-xs font-medium ${
                      new Date(client.next_follow_up) <= new Date() ? 'text-red-400' : 'text-zinc-500'
                    }`}>
                      📅 {format(new Date(client.next_follow_up), 'dd MMM')}
                    </div>
                  )}
                  <div className="text-xs text-zinc-600 mt-1">
                    {format(new Date(client.created_at), 'dd MMM yy')}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <ClientModal
          form={form}
          onChange={setForm}
          onSave={saveClient}
          onClose={() => setShowModal(false)}
          saving={saving}
          editMode={!!editingId}
        />
      )}

      {showImport && (
        <CSVImportModal
          onClose={() => setShowImport(false)}
          onDone={() => { fetchClients() }}
        />
      )}
    </div>
  )
}
