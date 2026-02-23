'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'

import {
  Search, Plus, X, Link as LinkIcon, Youtube, Globe,
  FileText, BookOpen, Loader2, ExternalLink, Tag,
} from 'lucide-react'
import { format } from 'date-fns'
import type { Knowledge, KnowledgeCategory, KnowledgeType } from '@/types'

const CATEGORIES: { value: KnowledgeCategory | 'all'; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: '📚' },
  { value: 'fitness', label: 'Fitness', icon: '💪' },
  { value: 'business', label: 'Business', icon: '💼' },
  { value: 'nutrition', label: 'Nutrition', icon: '🥗' },
  { value: 'tech', label: 'Tech', icon: '💻' },
  { value: 'inspiration', label: 'Inspiration', icon: '✨' },
  { value: 'herbalife', label: 'Herbalife', icon: '🌿' },
  { value: 'other', label: 'Other', icon: '📝' },
]

const TYPE_ICONS: Record<string, React.ElementType> = {
  video: Youtube,
  article: Globe,
  document: FileText,
  note: BookOpen,
  social: Globe,
  other: Globe,
}

function TypeIcon({ type }: { type: string }) {
  const Icon = TYPE_ICONS[type] || Globe
  return <Icon className="w-4 h-4" />
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&\s]+)/,
    /youtu\.be\/([^?\s]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

interface KnowledgeForm {
  url: string
  title: string
  description: string
  thumbnail: string
  type: KnowledgeType
  category: KnowledgeCategory
  tags: string
}

const defaultForm: KnowledgeForm = {
  url: '', title: '', description: '', thumbnail: '',
  type: 'note', category: 'other', tags: '',
}

export default function KnowledgePage() {
  
  const [items, setItems] = useState<Knowledge[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<KnowledgeForm>(defaultForm)
  const [urlInput, setUrlInput] = useState('')
  const [fetchingMeta, setFetchingMeta] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (category !== 'all') params.set('category', category)
      if (search) params.set('search', search)
      const res = await fetch(`/api/knowledge?${params}`)
      setItems(await res.json())
    } finally {
      setLoading(false)
    }
  }, [category, search])

  useEffect(() => {
    const timer = setTimeout(fetchItems, 300)
    return () => clearTimeout(timer)
  }, [fetchItems])

  const fetchMetadata = async () => {
    if (!urlInput.trim()) return
    setFetchingMeta(true)
    try {
      const res = await fetch('/api/knowledge/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput }),
      })
      const meta = await res.json()
      setForm({
        url: urlInput,
        title: meta.title || urlInput,
        description: meta.description || '',
        thumbnail: meta.image || '',
        type: meta.type as KnowledgeType || 'article',
        category: 'other',
        tags: '',
      })
    } finally {
      setFetchingMeta(false)
    }
  }

  const saveItem = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
        }),
      })
      if (res.ok) {
        setShowModal(false)
        setForm(defaultForm)
        setUrlInput('')
        fetchItems()
      }
    } finally {
      setSaving(false)
    }
  }

  const deleteItem = async (id: string) => {
    if (!confirm('Delete this item?')) return
    await fetch(`/api/knowledge/${id}`, { method: 'DELETE' })
    fetchItems()
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl text-white tracking-widest uppercase"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            Knowledge Base
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Save links, videos, articles & notes</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Quick URL input */}
      <div className="card mb-6">
        <p className="text-xs text-zinc-500 mb-3 font-medium uppercase tracking-wider">Quick Add URL</p>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchMetadata()}
              placeholder="Paste a URL (YouTube, article, website...)"
              className="input pl-9"
            />
          </div>
          <button
            onClick={() => { fetchMetadata(); setShowModal(true) }}
            disabled={!urlInput || fetchingMeta}
            className="btn-primary flex-shrink-0"
          >
            {fetchingMeta ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {fetchingMeta ? 'Fetching...' : 'Import'}
          </button>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              category === cat.value
                ? 'bg-brand-burgundy text-white'
                : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
            }`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search knowledge base..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input pl-9"
        />
      </div>

      {/* Items grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-48 rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="card text-center py-16">
          <BookOpen className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-400 mb-2">No items found</p>
          <p className="text-zinc-600 text-sm mb-6">Start saving links and notes to build your knowledge base</p>
          <button onClick={() => setShowModal(true)} className="btn-primary mx-auto">
            <Plus className="w-4 h-4" /> Add First Item
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const ytId = item.url ? extractYouTubeId(item.url) : null
            const thumbnail = ytId
              ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
              : item.thumbnail

            return (
              <div key={item.id} className="card-hover group flex flex-col">
                {/* Thumbnail */}
                {thumbnail && (
                  <div className="relative -mx-6 -mt-6 mb-4 h-40 overflow-hidden rounded-t-xl">
                    <img
                      src={thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {ytId && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                          <div className="w-0 h-0 border-t-4 border-t-transparent border-l-8 border-l-white border-b-4 border-b-transparent ml-1" />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-medium text-white text-sm line-clamp-2 flex-1">{item.title}</h3>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {item.description && (
                    <p className="text-xs text-zinc-500 line-clamp-2 mb-3 flex-1">{item.description}</p>
                  )}

                  <div className="flex items-center justify-between mt-auto pt-2">
                    <div className="flex items-center gap-2">
                      <span className={`badge ${
                        item.category === 'fitness' ? 'bg-brand-green/20 text-brand-green' :
                        item.category === 'business' ? 'bg-brand-burgundy/20 text-red-400' :
                        item.category === 'herbalife' ? 'bg-green-900/30 text-green-400' :
                        'bg-zinc-800 text-zinc-400'
                      }`}>
                        {item.category}
                      </span>
                      <span className="text-zinc-600 text-xs flex items-center gap-1">
                        <TypeIcon type={item.type} />
                        {item.type}
                      </span>
                    </div>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-zinc-500 hover:text-white transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.tags.map((tag) => (
                        <span key={tag} className="text-xs text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-zinc-700 mt-2">
                    {format(new Date(item.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Add to Knowledge Base</h2>
              <button onClick={() => { setShowModal(false); setForm(defaultForm); setUrlInput('') }}
                className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* URL fetch */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">URL (optional)</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    placeholder="https://..."
                    className="input"
                  />
                  <button
                    onClick={async () => {
                      if (!form.url) return
                      setFetchingMeta(true)
                      const res = await fetch('/api/knowledge/metadata', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url: form.url }),
                      })
                      const meta = await res.json()
                      setForm((f) => ({
                        ...f,
                        title: meta.title || f.url,
                        description: meta.description || '',
                        thumbnail: meta.image || '',
                        type: meta.type as KnowledgeType || 'article',
                      }))
                      setFetchingMeta(false)
                    }}
                    disabled={!form.url || fetchingMeta}
                    className="btn-secondary flex-shrink-0"
                  >
                    {fetchingMeta ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Fetch'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Title"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What's this about?"
                  rows={2}
                  className="input resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as KnowledgeType })}
                    className="select"
                  >
                    {['video', 'article', 'social', 'document', 'note', 'other'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as KnowledgeCategory })}
                    className="select"
                  >
                    {CATEGORIES.filter((c) => c.value !== 'all').map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Tags (comma separated)</label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="hyrox, motivation, business..."
                  className="input"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowModal(false); setForm(defaultForm) }}
                  className="btn-secondary flex-1 justify-center">Cancel</button>
                <button
                  onClick={saveItem}
                  disabled={!form.title || saving}
                  className="btn-primary flex-1 justify-center"
                >
                  {saving ? 'Saving...' : 'Save Item'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
