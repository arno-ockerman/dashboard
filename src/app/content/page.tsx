'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import {
  Calendar, Plus, X, ChevronLeft, ChevronRight, Filter,
  Image as ImageIcon, Trash2, Edit2, RefreshCw, Grid, List,
} from 'lucide-react'
import {
  format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks,
  isSameDay, parseISO, isToday, startOfMonth, endOfMonth, eachDayOfInterval,
  addMonths, subMonths, isSameMonth,
} from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────

type Platform = 'instagram' | 'facebook' | 'tiktok' | 'linkedin'
type PostType = 'reel' | 'carousel' | 'story' | 'post' | 'live'
type PostStatus = 'idea' | 'draft' | 'scheduled' | 'published'

interface ContentPost {
  id: string
  title: string
  caption: string | null
  platform: Platform
  post_type: PostType
  media_url: string | null
  scheduled_date: string | null
  status: PostStatus
  assigned_to: string
  tags: string[] | null
  created_at: string
  updated_at: string
}

// ─── Config ───────────────────────────────────────────────────────────────────

const PLATFORMS: { value: Platform; label: string; icon: string; color: string; bg: string }[] = [
  { value: 'instagram', label: 'Instagram', icon: '📸', color: 'text-pink-400', bg: 'bg-pink-900/20' },
  { value: 'facebook', label: 'Facebook', icon: '👥', color: 'text-blue-400', bg: 'bg-blue-900/20' },
  { value: 'tiktok', label: 'TikTok', icon: '🎵', color: 'text-cyan-400', bg: 'bg-cyan-900/20' },
  { value: 'linkedin', label: 'LinkedIn', icon: '💼', color: 'text-sky-400', bg: 'bg-sky-900/20' },
]

const POST_TYPES: { value: PostType; label: string; icon: string }[] = [
  { value: 'post', label: 'Post', icon: '🖼️' },
  { value: 'reel', label: 'Reel', icon: '🎬' },
  { value: 'carousel', label: 'Carousel', icon: '📂' },
  { value: 'story', label: 'Story', icon: '⭕' },
  { value: 'live', label: 'Live', icon: '🔴' },
]

const STATUS_CONFIG: Record<PostStatus, { label: string; color: string; bg: string; border: string; next: PostStatus | null }> = {
  idea: { label: 'Idee', color: 'text-zinc-400', bg: 'bg-zinc-800', border: 'border-zinc-700', next: 'draft' },
  draft: { label: 'Concept', color: 'text-amber-400', bg: 'bg-amber-900/20', border: 'border-amber-800/50', next: 'scheduled' },
  scheduled: { label: 'Gepland', color: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-800/50', next: 'published' },
  published: { label: 'Geplaatst ✓', color: 'text-emerald-400', bg: 'bg-emerald-900/20', border: 'border-emerald-800/50', next: null },
}

const defaultForm = {
  title: '',
  caption: '',
  platform: 'instagram' as Platform,
  post_type: 'post' as PostType,
  media_url: '',
  scheduled_date: new Date().toISOString().split('T')[0],
  status: 'idea' as PostStatus,
  assigned_to: 'kate',
  tags: [] as string[],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPlatform(p: string) {
  return PLATFORMS.find((x) => x.value === p) || PLATFORMS[0]
}

function getPostType(t: string) {
  return POST_TYPES.find((x) => x.value === t) || POST_TYPES[0]
}

// ─── Tag Input ────────────────────────────────────────────────────────────────

function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('')

  const add = () => {
    const v = input.trim().toLowerCase()
    if (v && !tags.includes(v)) onChange([...tags, v])
    setInput('')
  }

  const remove = (tag: string) => onChange(tags.filter((t) => t !== tag))

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map((t) => (
          <span key={t} className="badge bg-zinc-700 text-zinc-300 flex items-center gap-1">
            {t}
            <button onClick={() => remove(t)} className="hover:text-white ml-0.5">
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder="Add tag & press Enter"
          className="input text-xs"
        />
        <button onClick={add} className="btn-secondary text-xs px-3">Add</button>
      </div>
    </div>
  )
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({ post, onClick, onDelete }: {
  post: ContentPost
  onClick: () => void
  onDelete: (id: string) => void
}) {
  const plat = getPlatform(post.platform)
  const ptype = getPostType(post.post_type)
  const status = STATUS_CONFIG[post.status]

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-lg border p-2 transition-all hover:scale-[1.02] hover:shadow-lg ${status.bg} ${status.border} group relative`}
    >
      {post.media_url && (
        <div className="mb-1.5 rounded overflow-hidden h-16 bg-zinc-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.media_url} alt={post.title} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex items-center gap-1 mb-0.5">
        <span className="text-xs">{plat.icon}</span>
        <span className="text-xs">{ptype.icon}</span>
        <span className={`text-xs font-medium truncate flex-1 ${status.color}`}>{post.title}</span>
      </div>
      {post.caption && (
        <p className="text-zinc-500 text-[10px] truncate leading-tight">{post.caption}</p>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(post.id) }}
        className="absolute top-2 right-2 flex lg:hidden w-8 h-8 bg-zinc-900/80 border border-zinc-800 rounded-lg items-center justify-center text-zinc-400 active:scale-95 touch-manipulation"
        aria-label="Delete post"
        type="button"
      >
        <X className="w-4 h-4" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(post.id) }}
        className="absolute top-2 right-2 hidden lg:group-hover:flex w-6 h-6 bg-zinc-900 rounded items-center justify-center text-zinc-500 hover:text-red-400"
        aria-label="Delete post"
        type="button"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </button>
  )
}

// ─── Backlog / Ideas List ──────────────────────────────────────────────────────

function BacklogList({ posts, onSelect }: { posts: ContentPost[]; onSelect: (p: ContentPost) => void }) {
  return (
    <div className="card">
      <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
        <span className="text-brand-amber">💡</span>
        Content Ideeën Backlog
        <span className="badge bg-zinc-800 text-zinc-400 ml-auto">{posts.length}</span>
      </h3>
      {posts.length === 0 ? (
        <p className="text-zinc-600 text-sm text-center py-6">Geen ideeën in backlog</p>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => {
            const plat = getPlatform(post.platform)
            const ptype = getPostType(post.post_type)
            return (
              <button
                key={post.id}
                onClick={() => onSelect(post)}
                className="w-full text-left flex items-center gap-3 p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
              >
                <span>{plat.icon}</span>
                <span className="text-xs text-zinc-500">{ptype.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{post.title}</p>
                  {post.caption && <p className="text-xs text-zinc-500 truncate">{post.caption}</p>}
                </div>
                <span className="badge bg-zinc-700 text-zinc-400 text-xs flex-shrink-0">Kate</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Post Modal ───────────────────────────────────────────────────────────────

function PostModal({
  post,
  form,
  onChange,
  onSave,
  onClose,
  onAdvance,
  saving,
  editMode,
}: {
  post: ContentPost | null
  form: typeof defaultForm
  onChange: (f: typeof defaultForm) => void
  onSave: () => void
  onClose: () => void
  onAdvance: () => void
  saving: boolean
  editMode: boolean
}) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content max-w-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">{editMode && post ? 'Post Bewerken' : 'Content Plannen'}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {editMode && post && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-zinc-800">
            <span className={`badge ${STATUS_CONFIG[post.status].bg} ${STATUS_CONFIG[post.status].color}`}>
              {STATUS_CONFIG[post.status].label}
            </span>
            {STATUS_CONFIG[post.status].next && (
              <button onClick={onAdvance} className="text-xs text-brand-burgundy hover:underline ml-auto">
                → {STATUS_CONFIG[STATUS_CONFIG[post.status].next!].label}
              </button>
            )}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Titel *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => onChange({ ...form, title: e.target.value })}
              placeholder="Content titel of onderwerp"
              className="input"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Platform</label>
              <select
                value={form.platform}
                onChange={(e) => onChange({ ...form, platform: e.target.value as Platform })}
                className="select"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>{p.icon} {p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Type</label>
              <select
                value={form.post_type}
                onChange={(e) => onChange({ ...form, post_type: e.target.value as PostType })}
                className="select"
              >
                {POST_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(e) => onChange({ ...form, status: e.target.value as PostStatus })}
                className="select"
              >
                {(Object.entries(STATUS_CONFIG) as [PostStatus, (typeof STATUS_CONFIG)[PostStatus]][]).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">Geplande Datum</label>
              <input
                type="date"
                value={form.scheduled_date}
                onChange={(e) => onChange({ ...form, scheduled_date: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Caption (NL)</label>
            <textarea
              value={form.caption}
              onChange={(e) => onChange({ ...form, caption: e.target.value })}
              placeholder="Post tekst met hashtags... (Nederlands)"
              rows={4}
              className="input resize-none"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              <ImageIcon className="w-3 h-3 inline mr-1" />
              Media URL (optioneel)
            </label>
            <input
              type="url"
              value={form.media_url}
              onChange={(e) => onChange({ ...form, media_url: e.target.value })}
              placeholder="https://..."
              className="input"
            />
            {form.media_url && (
              <div className="mt-2 rounded-lg overflow-hidden h-24 bg-zinc-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.media_url} alt="preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Tags</label>
            <TagInput
              tags={form.tags}
              onChange={(t) => onChange({ ...form, tags: t })}
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Toegewezen aan</label>
            <select
              value={form.assigned_to}
              onChange={(e) => onChange({ ...form, assigned_to: e.target.value })}
              className="select"
            >
              <option value="kate">✍️ Kate (Content Agent)</option>
              <option value="arno">👤 Arno</option>
              <option value="jarvis">🧠 Jarvis</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">Annuleren</button>
            <button
              onClick={onSave}
              disabled={!form.title || saving}
              className="btn-primary flex-1 justify-center"
            >
              {saving ? 'Opslaan...' : editMode ? 'Bijwerken' : 'Plannen'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ContentPage() {
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [backlog, setBacklog] = useState<ContentPost[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week')
  const [weekOffset, setWeekOffset] = useState(0)
  const [monthOffset, setMonthOffset] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<typeof defaultForm>({ ...defaultForm })
  const [saving, setSaving] = useState(false)
  const [selectedPost, setSelectedPost] = useState<ContentPost | null>(null)
  const [filterPlatform, setFilterPlatform] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // Week view dates
  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 })
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Month view dates
  const monthDate = addMonths(new Date(), monthOffset)
  const monthStart = startOfMonth(monthDate)
  const monthEnd = endOfMonth(monthDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const monthDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (viewMode === 'week') {
        params.set('week_start', format(weekStart, 'yyyy-MM-dd'))
        params.set('week_end', format(weekEnd, 'yyyy-MM-dd'))
      } else {
        params.set('week_start', format(calendarStart, 'yyyy-MM-dd'))
        params.set('week_end', format(calendarEnd, 'yyyy-MM-dd'))
      }
      if (filterPlatform !== 'all') params.set('platform', filterPlatform)
      if (filterStatus !== 'all') params.set('status', filterStatus)

      const [calRes, backlogRes] = await Promise.all([
        fetch(`/api/content-posts?${params}`),
        fetch('/api/content-posts?status=idea'),
      ])
      const calData = await calRes.json()
      const backlogData = await backlogRes.json()
      setPosts(Array.isArray(calData) ? calData.filter((p: ContentPost) => p.scheduled_date) : [])
      setBacklog(Array.isArray(backlogData) ? backlogData.filter((p: ContentPost) => !p.scheduled_date) : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [viewMode, weekOffset, monthOffset, filterPlatform, filterStatus])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  const getPostsForDay = (day: Date) =>
    posts.filter((p) => p.scheduled_date && isSameDay(parseISO(p.scheduled_date), day))

  const openNew = (date?: string) => {
    setSelectedPost(null)
    setForm({
      ...defaultForm,
      scheduled_date: date || new Date().toISOString().split('T')[0],
    })
    setShowModal(true)
  }

  const openEdit = (post: ContentPost) => {
    setSelectedPost(post)
    setForm({
      title: post.title,
      caption: post.caption || '',
      platform: post.platform,
      post_type: post.post_type,
      media_url: post.media_url || '',
      scheduled_date: post.scheduled_date || new Date().toISOString().split('T')[0],
      status: post.status,
      assigned_to: post.assigned_to,
      tags: post.tags || [],
    })
    setShowModal(true)
  }

  const savePost = async () => {
    if (!form.title) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        media_url: form.media_url || null,
        caption: form.caption || null,
        tags: form.tags.length > 0 ? form.tags : null,
      }

      if (selectedPost) {
        await fetch('/api/content-posts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: selectedPost.id, ...payload }),
        })
      } else {
        await fetch('/api/content-posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      setShowModal(false)
      fetchPosts()
    } finally {
      setSaving(false)
    }
  }

  const advanceStatus = async () => {
    if (!selectedPost) return
    const next = STATUS_CONFIG[selectedPost.status].next
    if (!next) return
    await fetch('/api/content-posts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedPost.id, status: next }),
    })
    setShowModal(false)
    fetchPosts()
  }

  const deletePost = async (id: string) => {
    if (!confirm('Post verwijderen?')) return
    await fetch(`/api/content-posts?id=${id}`, { method: 'DELETE' })
    fetchPosts()
  }

  const stats = {
    idea: posts.filter((p) => p.status === 'idea').length + backlog.length,
    draft: posts.filter((p) => p.status === 'draft').length,
    scheduled: posts.filter((p) => p.status === 'scheduled').length,
    published: posts.filter((p) => p.status === 'published').length,
  }

  const rangeStart = viewMode === 'week' ? weekStart : monthStart
  const rangeEnd = viewMode === 'week' ? weekEnd : monthEnd
  const mobileScheduledPosts = posts
    .filter((p) => {
      if (!p.scheduled_date) return false
      const d = parseISO(p.scheduled_date)
      return d >= rangeStart && d <= rangeEnd
    })
    .sort((a, b) => parseISO(a.scheduled_date!).getTime() - parseISO(b.scheduled_date!).getTime())
    .reduce((acc, post) => {
      const key = post.scheduled_date!
      acc[key] = acc[key] ? [...acc[key], post] : [post]
      return acc
    }, {} as Record<string, ContentPost[]>)
  const mobileScheduledDates = Object.keys(mobileScheduledPosts).sort()

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl text-white tracking-widest uppercase" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            Content Planner
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            {viewMode === 'week'
              ? `${format(weekStart, 'MMM d')} — ${format(weekEnd, 'MMM d, yyyy')}`
              : format(monthDate, 'MMMM yyyy')}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode toggle */}
          <div className="flex bg-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${viewMode === 'week' ? 'bg-brand-burgundy text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${viewMode === 'month' ? 'bg-brand-burgundy text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              Maand
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => viewMode === 'week' ? setWeekOffset((o) => o - 1) : setMonthOffset((o) => o - 1)}
              className="btn-ghost p-2"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setWeekOffset(0); setMonthOffset(0) }}
              className="btn-ghost text-xs px-3"
            >
              Vandaag
            </button>
            <button
              onClick={() => viewMode === 'week' ? setWeekOffset((o) => o + 1) : setMonthOffset((o) => o + 1)}
              className="btn-ghost p-2"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button onClick={() => openNew()} className="btn-primary">
            <Plus className="w-4 h-4" /> Nieuw
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {(Object.entries(STATUS_CONFIG) as [PostStatus, typeof STATUS_CONFIG[PostStatus]][]).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setFilterStatus(filterStatus === key ? 'all' : key)}
            className={`card text-center py-3 transition-all hover:border-zinc-600 cursor-pointer ${filterStatus === key ? 'border-brand-burgundy/50' : ''}`}
          >
            <div className={`text-xl font-bold ${val.color}`}>{stats[key] || 0}</div>
            <div className="text-xs text-zinc-500 mt-1">{val.label}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-zinc-500" />
          <span className="text-xs text-zinc-500">Platform:</span>
        </div>
        <button
          onClick={() => setFilterPlatform('all')}
          className={`badge cursor-pointer transition-colors ${filterPlatform === 'all' ? 'bg-brand-burgundy text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
        >
          Alle
        </button>
        {PLATFORMS.map((p) => (
          <button
            key={p.value}
            onClick={() => setFilterPlatform(filterPlatform === p.value ? 'all' : p.value)}
            className={`badge cursor-pointer transition-colors ${filterPlatform === p.value ? `${p.bg} ${p.color}` : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
          >
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      {/* Mobile list view (sorted by date) */}
      <div className="lg:hidden card mb-6 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <List className="w-4 h-4 text-zinc-500" />
            <p className="text-sm font-semibold text-white">Planned posts</p>
          </div>
          <button onClick={() => openNew()} className="btn-primary px-3 py-2 text-xs">
            <Plus className="w-4 h-4" /> Nieuw
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-zinc-600 text-sm">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            Loading...
          </div>
        ) : mobileScheduledDates.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-zinc-400 text-sm">Geen geplande posts in deze periode</p>
            <button onClick={() => openNew()} className="btn-secondary mt-4 text-sm px-4 py-3">
              <Plus className="w-4 h-4" /> Plan je eerste post
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {mobileScheduledDates.map((date) => (
              <div key={date} className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/20">
                <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/40 border-b border-zinc-800">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {format(parseISO(date), 'EEEE d MMM')}
                    </p>
                    <p className="text-xs text-zinc-500">{format(parseISO(date), 'yyyy-MM-dd')}</p>
                  </div>
                  <button
                    onClick={() => openNew(date)}
                    className="btn-ghost px-3 py-2 text-xs flex-shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-3 space-y-2">
                  {mobileScheduledPosts[date].map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onClick={() => openEdit(post)}
                      onDelete={deletePost}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Calendar: Week View */}
      {viewMode === 'week' && (
        <div className="hidden lg:grid grid-cols-7 gap-2 mb-8">
          {weekDays.map((day) => {
            const dayPosts = getPostsForDay(day)
            const today = isToday(day)

            return (
              <div key={day.toISOString()} className="min-h-40">
                <div className={`text-center mb-2 pb-2 border-b ${today ? 'border-brand-burgundy/40' : 'border-zinc-800'}`}>
                  <p className="text-xs text-zinc-500 uppercase tracking-wide">{format(day, 'EEE')}</p>
                  <p className={`text-lg font-bold mt-0.5 ${today ? 'text-brand-burgundy' : 'text-zinc-400'}`}>
                    {format(day, 'd')}
                  </p>
                </div>
                <div className="space-y-1.5">
                  {dayPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onClick={() => openEdit(post)}
                      onDelete={deletePost}
                    />
                  ))}
                  <button
                    onClick={() => openNew(format(day, 'yyyy-MM-dd'))}
                    className="w-full text-xs text-zinc-700 hover:text-zinc-500 py-1 rounded flex items-center justify-center gap-1 hover:bg-zinc-800/50 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Calendar: Month View */}
      {viewMode === 'month' && (
        <div className="hidden lg:block card mb-8 overflow-hidden p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map((d) => (
              <div key={d} className="text-center text-xs text-zinc-500 font-semibold uppercase tracking-wide py-1">
                {d}
              </div>
            ))}
          </div>
          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((day) => {
              const dayPosts = getPostsForDay(day)
              const today = isToday(day)
              const inMonth = isSameMonth(day, monthDate)

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-20 rounded-lg p-1 border transition-colors ${
                    today ? 'border-brand-burgundy/40 bg-brand-burgundy/5' : 'border-zinc-800 hover:border-zinc-700'
                  } ${!inMonth ? 'opacity-30' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold ${today ? 'text-brand-burgundy' : 'text-zinc-400'}`}>
                      {format(day, 'd')}
                    </span>
                    {inMonth && (
                      <button
                        onClick={() => openNew(format(day, 'yyyy-MM-dd'))}
                        className="text-zinc-700 hover:text-zinc-400 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {dayPosts.slice(0, 3).map((post) => {
                      const plat = getPlatform(post.platform)
                      const status = STATUS_CONFIG[post.status]
                      return (
                        <button
                          key={post.id}
                          onClick={() => openEdit(post)}
                          className={`w-full text-left text-[9px] px-1 py-0.5 rounded ${status.bg} ${status.color} truncate`}
                        >
                          {plat.icon} {post.title}
                        </button>
                      )
                    })}
                    {dayPosts.length > 3 && (
                      <p className="text-[9px] text-zinc-500 pl-1">+{dayPosts.length - 3} meer</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Backlog */}
      <BacklogList posts={backlog} onSelect={openEdit} />

      {/* Empty state */}
      {!loading && posts.length === 0 && backlog.length === 0 && (
        <div className="card text-center py-16 mt-6">
          <Calendar className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-400 mb-2">Nog geen content gepland</p>
          <p className="text-zinc-600 text-sm mb-6">Begin met je contentkalender</p>
          <button onClick={() => openNew()} className="btn-primary mx-auto">
            <Plus className="w-4 h-4" /> Content Plannen
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <PostModal
          post={selectedPost}
          form={form}
          onChange={setForm}
          onSave={savePost}
          onClose={() => setShowModal(false)}
          onAdvance={advanceStatus}
          saving={saving}
          editMode={!!selectedPost}
        />
      )}
    </div>
  )
}
