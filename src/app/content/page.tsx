'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'

import {
  Calendar, Plus, X, ChevronLeft, ChevronRight, Instagram,
} from 'lucide-react'
import {
  format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks,
  isSameDay, parseISO,
} from 'date-fns'
import type { Content, ContentPlatform, ContentStatus } from '@/types'

const PLATFORMS: { value: ContentPlatform; label: string; icon: string; color: string }[] = [
  { value: 'instagram', label: 'Instagram', icon: '📷', color: 'text-pink-400' },
  { value: 'telegram', label: 'Telegram', icon: '✈️', color: 'text-blue-400' },
  { value: 'stories', label: 'Stories', icon: '🟣', color: 'text-purple-400' },
  { value: 'reels', label: 'Reels', icon: '🎬', color: 'text-red-400' },
  { value: 'tiktok', label: 'TikTok', icon: '🎵', color: 'text-cyan-400' },
  { value: 'other', label: 'Other', icon: '📱', color: 'text-zinc-400' },
]

const STATUS_CONFIG: Record<ContentStatus, { label: string; color: string; bg: string; nextStatus: ContentStatus | null }> = {
  idea: { label: 'Idea', color: 'text-zinc-400', bg: 'bg-zinc-800', nextStatus: 'draft' },
  draft: { label: 'Draft', color: 'text-yellow-400', bg: 'bg-yellow-900/30', nextStatus: 'scheduled' },
  scheduled: { label: 'Scheduled', color: 'text-blue-400', bg: 'bg-blue-900/30', nextStatus: 'posted' },
  posted: { label: 'Posted ✓', color: 'text-green-400', bg: 'bg-green-900/30', nextStatus: null },
}

interface ContentForm {
  title: string
  description: string
  platform: ContentPlatform
  status: ContentStatus
  scheduled_date: string
  caption: string
  content_type: string
}

const defaultForm: ContentForm = {
  title: '', description: '',
  platform: 'instagram', status: 'idea',
  scheduled_date: new Date().toISOString().split('T')[0],
  caption: '', content_type: '',
}

export default function ContentPage() {
  
  const [items, setItems] = useState<Content[]>([])
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<ContentForm>(defaultForm)
  const [saving, setSaving] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Content | null>(null)

  const currentWeekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 })
  const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        week_start: format(currentWeekStart, 'yyyy-MM-dd'),
        week_end: format(currentWeekEnd, 'yyyy-MM-dd'),
      })
      const res = await fetch(`/api/content?${params}`)
      setItems(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [weekOffset])

  const saveContent = async () => {
    if (!form.title) return
    setSaving(true)
    try {
      const res = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setShowModal(false)
        setForm(defaultForm)
        fetchData()
      }
    } finally {
      setSaving(false)
    }
  }

  const advanceStatus = async (item: Content) => {
    const nextStatus = STATUS_CONFIG[item.status].nextStatus
    if (!nextStatus) return

    await fetch('/api/content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, status: nextStatus }),
    })
    fetchData()
  }

  const getItemsForDay = (day: Date) =>
    items.filter((item) => item.scheduled_date && isSameDay(parseISO(item.scheduled_date), day))

  const getPlatformConfig = (platform: string) =>
    PLATFORMS.find((p) => p.value === platform) || PLATFORMS[PLATFORMS.length - 1]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl text-white tracking-widest uppercase"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            Content Planner
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            {format(currentWeekStart, 'MMM d')} — {format(currentWeekEnd, 'MMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekOffset((o) => o - 1)}
              className="btn-ghost p-2"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className="btn-ghost text-xs px-3"
            >
              This Week
            </button>
            <button
              onClick={() => setWeekOffset((o) => o + 1)}
              className="btn-ghost p-2"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => { setForm(defaultForm); setShowModal(true) }}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" /> Add Content
          </button>
        </div>
      </div>

      {/* Status legend */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        {(Object.entries(STATUS_CONFIG) as [ContentStatus, typeof STATUS_CONFIG[ContentStatus]][]).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs">
            <div className={`w-2.5 h-2.5 rounded-full ${val.bg.replace('bg-', 'bg-').replace('/30', '')}`} />
            <span className={val.color}>{val.label}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2 mb-8">
        {weekDays.map((day) => {
          const dayItems = getItemsForDay(day)
          const isToday = isSameDay(day, new Date())

          return (
            <div key={day.toISOString()} className="min-h-32">
              {/* Day header */}
              <div className={`text-center mb-2 pb-2 border-b ${isToday ? 'border-brand-burgundy/40' : 'border-zinc-800'}`}>
                <p className="text-xs text-zinc-500 uppercase tracking-wide">{format(day, 'EEE')}</p>
                <p className={`text-lg font-bold mt-0.5 ${isToday ? 'text-brand-burgundy' : 'text-zinc-400'}`}>
                  {format(day, 'd')}
                </p>
              </div>

              {/* Items for this day */}
              <div className="space-y-1.5">
                {dayItems.map((item) => {
                  const statusConf = STATUS_CONFIG[item.status]
                  const platformConf = getPlatformConfig(item.platform || 'other')

                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-all hover:scale-105 ${statusConf.bg} border border-zinc-700/50`}
                    >
                      <div className="flex items-center gap-1 mb-0.5">
                        <span>{platformConf.icon}</span>
                        <span className={`truncate ${statusConf.color}`}>{item.title}</span>
                      </div>
                    </button>
                  )
                })}

                <button
                  onClick={() => {
                    setForm({
                      ...defaultForm,
                      scheduled_date: format(day, 'yyyy-MM-dd'),
                    })
                    setShowModal(true)
                  }}
                  className="w-full text-xs text-zinc-700 hover:text-zinc-500 py-1 rounded flex items-center justify-center gap-1 hover:bg-zinc-800/50 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Items without date / all items */}
      {items.length === 0 && !loading && (
        <div className="card text-center py-16">
          <Calendar className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-400 mb-2">No content planned this week</p>
          <p className="text-zinc-600 text-sm mb-6">Start planning your content calendar</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mx-auto">
            <Plus className="w-4 h-4" /> Plan Content
          </button>
        </div>
      )}

      {/* Item detail modal */}
      {selectedItem && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setSelectedItem(null)}>
          <div className="modal-content">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">{getPlatformConfig(selectedItem.platform || 'other').icon}</span>
                <h2 className="text-lg font-bold text-white">{selectedItem.title}</h2>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`badge ${STATUS_CONFIG[selectedItem.status].bg} ${STATUS_CONFIG[selectedItem.status].color}`}>
                  {STATUS_CONFIG[selectedItem.status].label}
                </span>
                <span className="text-xs text-zinc-500">
                  {selectedItem.platform} · {selectedItem.scheduled_date && format(parseISO(selectedItem.scheduled_date), 'MMM d')}
                </span>
              </div>

              {selectedItem.description && (
                <p className="text-sm text-zinc-300">{selectedItem.description}</p>
              )}

              {selectedItem.caption && (
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Caption</p>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap bg-zinc-800/50 p-3 rounded-lg">
                    {selectedItem.caption}
                  </p>
                </div>
              )}

              {STATUS_CONFIG[selectedItem.status].nextStatus && (
                <button
                  onClick={() => { advanceStatus(selectedItem); setSelectedItem(null) }}
                  className="btn-primary w-full justify-center"
                >
                  Move to {STATUS_CONFIG[STATUS_CONFIG[selectedItem.status].nextStatus!].label} →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Content Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Plan Content</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Content title or topic"
                  className="input"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Platform</label>
                  <select
                    value={form.platform}
                    onChange={(e) => setForm({ ...form, platform: e.target.value as ContentPlatform })}
                    className="select"
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p.value} value={p.value}>{p.icon} {p.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as ContentStatus })}
                    className="select"
                  >
                    {(Object.entries(STATUS_CONFIG) as [ContentStatus, typeof STATUS_CONFIG[ContentStatus]][]).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Scheduled Date</label>
                <input
                  type="date"
                  value={form.scheduled_date}
                  onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Description / Idea</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What's this content about?"
                  rows={2}
                  className="input resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Caption (optional)</label>
                <textarea
                  value={form.caption}
                  onChange={(e) => setForm({ ...form, caption: e.target.value })}
                  placeholder="Post caption with hashtags..."
                  rows={3}
                  className="input resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button
                  onClick={saveContent}
                  disabled={!form.title || saving}
                  className="btn-primary flex-1 justify-center"
                >
                  {saving ? 'Saving...' : 'Plan Content'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
