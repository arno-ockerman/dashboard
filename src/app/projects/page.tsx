'use client'

import { useEffect, useState } from 'react'
import {
  Folder, Github, Globe, ExternalLink, RefreshCw,
  Plus, X, CheckCircle2, Clock, Pause, Lightbulb,
  Activity, GitBranch,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Project, ProjectStatus } from '@/types'

// ─── Static project metadata (enriches DB data) ──────────────────────────────

const PROJECT_META: Record<string, {
  emoji: string
  color: string
  bgClass: string
  borderClass: string
  textClass: string
  techStack: string[]
}> = {
  'Make It Happen': {
    emoji: '🚀',
    color: 'burgundy',
    bgClass: 'bg-brand-burgundy/10',
    borderClass: 'border-brand-burgundy/30',
    textClass: 'text-brand-burgundy',
    techStack: ['React', 'Next.js', 'Supabase', 'Tailwind'],
  },
  'Club App': {
    emoji: '📱',
    color: 'blue',
    bgClass: 'bg-blue-900/10',
    borderClass: 'border-blue-700/30',
    textClass: 'text-blue-400',
    techStack: ['React Native', 'Expo', 'Firebase'],
  },
  'Dashboard': {
    emoji: '🎛️',
    color: 'green',
    bgClass: 'bg-brand-green/10',
    borderClass: 'border-brand-green/30',
    textClass: 'text-emerald-400',
    techStack: ['Next.js 14', 'Supabase', 'Tailwind', 'TypeScript'],
  },
  'beinspiredbyus.be': {
    emoji: '✨',
    color: 'amber',
    bgClass: 'bg-amber-900/10',
    borderClass: 'border-amber-700/30',
    textClass: 'text-amber-400',
    techStack: ['HTML', 'CSS', 'JavaScript'],
  },
}

// Default fallback for projects not in meta
const DEFAULT_META = {
  emoji: '📁',
  bgClass: 'bg-zinc-800/50',
  borderClass: 'border-zinc-700/30',
  textClass: 'text-zinc-400',
  techStack: [],
}

const STATUS_CONFIG: Record<ProjectStatus, { icon: React.ElementType; label: string; cls: string }> = {
  active: { icon: Activity, label: 'Active', cls: 'text-emerald-400 bg-emerald-900/20 border-emerald-700/40' },
  paused: { icon: Pause, label: 'Paused', cls: 'text-amber-400 bg-amber-900/20 border-amber-700/40' },
  completed: { icon: CheckCircle2, label: 'Completed', cls: 'text-blue-400 bg-blue-900/20 border-blue-700/40' },
  planning: { icon: Lightbulb, label: 'Planning', cls: 'text-purple-400 bg-purple-900/20 border-purple-700/40' },
}

// ─── Add Project Modal ────────────────────────────────────────────────────────

interface AddProjectModalProps {
  onClose: () => void
  onSuccess: () => void
}

function AddProjectModal({ onClose, onSuccess }: AddProjectModalProps) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    status: 'active' as ProjectStatus,
    github_repo: '',
    vercel_url: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed to create project')
      onSuccess()
      onClose()
    } catch (err) {
      setError(String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-brand-burgundy" />
            New Project
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Project Name *</label>
            <input className="input" placeholder="My Awesome Project" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
          </div>

          <div>
            <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Description</label>
            <textarea className="input resize-none" rows={2} placeholder="What is this project about?"
              value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div>
            <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Status</label>
            <select className="select" value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}>
              <option value="active">Active</option>
              <option value="planning">Planning</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-zinc-400 font-medium mb-1.5 block">GitHub Repo</label>
            <input className="input" placeholder="username/repo-name" value={form.github_repo}
              onChange={(e) => setForm({ ...form, github_repo: e.target.value })} />
          </div>

          <div>
            <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Vercel URL</label>
            <input className="input" placeholder="https://myproject.vercel.app" value={form.vercel_url}
              onChange={(e) => setForm({ ...form, vercel_url: e.target.value })} />
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-900/20 border border-red-900/40 rounded-lg p-3">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">
              {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Create</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Project Card ─────────────────────────────────────────────────────────────

interface ProjectCardProps {
  project: Project
}

function ProjectCard({ project }: ProjectCardProps) {
  const meta = PROJECT_META[project.name] || DEFAULT_META
  const statusCfg = STATUS_CONFIG[project.status as ProjectStatus] || STATUS_CONFIG.active
  const StatusIcon = statusCfg.icon

  return (
    <div className={`card border ${meta.borderClass} hover:border-opacity-70 transition-all duration-200 flex flex-col`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 ${meta.bgClass} border ${meta.borderClass} rounded-xl flex items-center justify-center text-2xl flex-shrink-0`}>
            {meta.emoji}
          </div>
          <div>
            <h3 className="font-bold text-white">{project.name}</h3>
            {project.description && (
              <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{project.description}</p>
            )}
          </div>
        </div>
        <span className={`badge border ${statusCfg.cls} flex items-center gap-1`}>
          <StatusIcon className="w-3 h-3" />
          {statusCfg.label}
        </span>
      </div>

      {/* Tech Stack */}
      {meta.techStack.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {meta.techStack.map((tech) => (
            <span key={tech} className="badge bg-zinc-800 text-zinc-400 border border-zinc-700">
              {tech}
            </span>
          ))}
        </div>
      )}

      {/* Last update */}
      <div className="flex items-center gap-2 mb-4 text-xs text-zinc-500">
        <Clock className="w-3.5 h-3.5" />
        Updated {formatDistanceToNow(new Date(project.last_update), { addSuffix: true })}
      </div>

      {/* Links */}
      <div className="flex gap-2 mt-auto">
        {project.github_repo && (
          <a
            href={`https://github.com/${project.github_repo}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-xs text-zinc-300 hover:text-white border border-zinc-700"
          >
            <Github className="w-3.5 h-3.5" />
            GitHub
            <ExternalLink className="w-3 h-3 text-zinc-600" />
          </a>
        )}
        {project.vercel_url && (
          <a
            href={project.vercel_url}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg ${meta.bgClass} hover:brightness-125 transition-all text-xs ${meta.textClass} border ${meta.borderClass}`}
          >
            <Globe className="w-3.5 h-3.5" />
            Live Site
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
        {!project.github_repo && !project.vercel_url && (
          <div className="flex items-center gap-2 text-xs text-zinc-600 py-2">
            <GitBranch className="w-3.5 h-3.5" />
            No links added yet
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Projects Page ───────────────────────────────────────────────────────

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/projects')
      const data = await res.json()
      setProjects(data.projects || [])
    } catch (err) {
      console.error('Failed to load projects:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const stats = {
    total: projects.length,
    active: projects.filter((p) => p.status === 'active').length,
    planning: projects.filter((p) => p.status === 'planning').length,
    completed: projects.filter((p) => p.status === 'completed').length,
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
            Projects
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            {stats.active} active · {stats.planning} planning · {stats.completed} completed
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchProjects} className="btn-ghost">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total', value: stats.total, icon: Folder, color: 'text-zinc-400', bg: 'bg-zinc-800' },
          { label: 'Active', value: stats.active, icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-900/20' },
          { label: 'Planning', value: stats.planning, icon: Lightbulb, color: 'text-purple-400', bg: 'bg-purple-900/20' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'text-blue-400', bg: 'bg-blue-900/20' },
        ].map((s) => {
          const SIcon = s.icon
          return (
            <div key={s.label} className="card flex items-center gap-4">
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <SIcon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-zinc-500">{s.label}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Project Grid */}
      {loading && projects.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton rounded-xl h-48" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="card text-center py-16">
          <Folder className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-white font-semibold mb-2">No projects yet</h3>
          <p className="text-zinc-500 text-sm mb-6">Add your first project to track its status</p>
          <button onClick={() => setShowAddModal(true)} className="btn-primary mx-auto">
            <Plus className="w-4 h-4" /> Add Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {/* Add Project Modal */}
      {showAddModal && (
        <AddProjectModal
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchProjects}
        />
      )}
    </div>
  )
}
