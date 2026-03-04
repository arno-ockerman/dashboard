'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ListTodo, Loader2, CheckCircle2, Plus, X, RefreshCw,
  ArrowRight, Filter, Trash2, ChevronRight,
} from 'lucide-react'
import { format } from 'date-fns'
import type { Task, TaskStatus, TaskPriority } from '@/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const AGENTS = ['Jarvis', 'Mike', 'Kate', 'Steve', 'Alex']

const AGENT_EMOJIS: Record<string, string> = {
  Jarvis: '🧠',
  Mike: '⚡',
  Kate: '✍️',
  Steve: '🔍',
  Alex: '📈',
}

const PRIORITY_CONFIG = {
  high: { label: 'High', dot: '🔴', cls: 'bg-red-900/30 text-red-400 border-red-900/40' },
  medium: { label: 'Medium', dot: '🟡', cls: 'bg-amber-900/30 text-amber-400 border-amber-900/40' },
  low: { label: 'Low', dot: '🟢', cls: 'bg-green-900/30 text-green-400 border-green-900/40' },
}

const COLUMNS: { id: TaskStatus; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'todo', label: 'To Do', icon: ListTodo, color: 'text-zinc-400' },
  { id: 'in_progress', label: 'In Progress', icon: Loader2, color: 'text-brand-amber' },
  { id: 'done', label: 'Done', icon: CheckCircle2, color: 'text-brand-green' },
]

// ─── Add Task Modal ───────────────────────────────────────────────────────────

interface AddTaskModalProps {
  defaultStatus?: TaskStatus
  onClose: () => void
  onSuccess: () => void
}

function AddTaskModal({ defaultStatus = 'todo', onClose, onSuccess }: AddTaskModalProps) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    assigned_to: '',
    priority: 'medium' as TaskPriority,
    status: defaultStatus,
    project: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Failed to create task')
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
            New Task
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Title *</label>
            <input
              className="input"
              placeholder="Task title..."
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Description</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Details..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Assign To</label>
              <select
                className="select"
                value={form.assigned_to}
                onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
              >
                <option value="">— Unassigned —</option>
                {AGENTS.map((a) => (
                  <option key={a} value={a}>{AGENT_EMOJIS[a]} {a}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Priority</label>
              <select
                className="select"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
              >
                <option value="high">🔴 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Status</label>
              <select
                className="select"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Project</label>
              <select
                className="select"
                value={form.project}
                onChange={(e) => setForm({ ...form, project: e.target.value })}
              >
                <option value="">— None —</option>
                <option value="Make It Happen">Make It Happen</option>
                <option value="Club App">Club App</option>
                <option value="Dashboard">Dashboard</option>
                <option value="beinspiredbyus.be">beinspiredbyus.be</option>
              </select>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-900/20 border border-red-900/40 rounded-lg p-3">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">
              {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" /> Create Task</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Task Card ────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task
  onStatusChange: (id: string, status: TaskStatus) => void
  onDelete: (id: string) => void
}

function TaskCard({ task, onStatusChange, onDelete }: TaskCardProps) {
  const priority = PRIORITY_CONFIG[task.priority]
  const nextStatus: TaskStatus = task.status === 'todo' ? 'in_progress' : task.status === 'in_progress' ? 'done' : 'todo'
  const nextLabel = task.status === 'todo' ? 'Start' : task.status === 'in_progress' ? 'Complete' : 'Reopen'

  return (
    <div className="bg-zinc-800/80 border border-zinc-700/50 rounded-xl p-4 hover:border-zinc-600 transition-all duration-200 group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-medium text-white leading-tight flex-1">{task.title}</h3>
        <button
          onClick={() => onDelete(task.id)}
          className="flex lg:hidden w-10 h-10 items-center justify-center rounded-xl text-zinc-500 hover:text-red-400 hover:bg-white/5 transition-colors flex-shrink-0 touch-manipulation"
          title="Delete task"
          aria-label="Delete task"
          type="button"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="hidden lg:group-hover:flex w-9 h-9 items-center justify-center rounded-lg text-zinc-600 hover:text-red-400 hover:bg-white/5 transition-all flex-shrink-0"
          title="Delete task"
          aria-label="Delete task"
          type="button"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {task.description && (
        <p className="text-xs text-zinc-500 mb-3 line-clamp-2">{task.description}</p>
      )}

      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className={`badge border ${priority.cls}`}>
          {priority.dot} {priority.label}
        </span>
        {task.assigned_to && (
          <span className="badge bg-zinc-700/50 text-zinc-300 border border-zinc-600/50">
            {AGENT_EMOJIS[task.assigned_to] || '🤖'} {task.assigned_to}
          </span>
        )}
        {task.project && (
          <span className="badge bg-zinc-700/30 text-zinc-400 border border-zinc-700/50">
            {task.project}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-600">
          {format(new Date(task.created_at), 'MMM d')}
        </span>
        <button
          onClick={() => onStatusChange(task.id, nextStatus)}
          className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
        >
          {nextLabel} <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  column: typeof COLUMNS[0]
  tasks: Task[]
  onStatusChange: (id: string, status: TaskStatus) => void
  onDelete: (id: string) => void
  onAdd: (status: TaskStatus) => void
}

function KanbanColumn({ column, tasks, onStatusChange, onDelete, onAdd }: KanbanColumnProps) {
  const Icon = column.icon

  return (
    <div className="flex flex-col bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Column header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${column.color}`} />
          <span className="font-semibold text-white text-sm">{column.label}</span>
          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAdd(column.id)}
          className="text-zinc-500 hover:text-white transition-colors"
          title={`Add to ${column.label}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Tasks */}
      <div className="flex-1 p-3 space-y-3 min-h-48 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Icon className="w-6 h-6 text-zinc-700 mb-2" />
            <p className="text-zinc-600 text-xs">No tasks here</p>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

      {/* Add button */}
      <button
        onClick={() => onAdd(column.id)}
        className="flex items-center gap-2 px-4 py-3 text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50 transition-all text-xs border-t border-zinc-800"
      >
        <Plus className="w-3.5 h-3.5" />
        Add task
      </button>
    </div>
  )
}

// ─── Main Tasks Page ──────────────────────────────────────────────────────────

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [addModal, setAddModal] = useState<TaskStatus | null>(null)
  const [filterAgent, setFilterAgent] = useState<string>('')
  const [filterPriority, setFilterPriority] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterAgent) params.set('assigned_to', filterAgent)
      if (filterPriority) params.set('priority', filterPriority)
      const res = await fetch(`/api/tasks?${params}`)
      const data = await res.json()
      setTasks(data.tasks || [])
    } catch (err) {
      console.error('Failed to load tasks:', err)
    } finally {
      setLoading(false)
    }
  }, [filterAgent, filterPriority])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const handleStatusChange = async (id: string, status: TaskStatus) => {
    try {
      await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status, updated_at: new Date().toISOString() } : t))
      )
    } catch (err) {
      console.error('Failed to update task:', err)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this task?')) return
    try {
      await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
      setTasks((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
      console.error('Failed to delete task:', err)
    }
  }

  const getColumnTasks = (status: TaskStatus) =>
    tasks.filter((t) => t.status === status)

  const stats = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === 'todo').length,
    inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    done: tasks.filter((t) => t.status === 'done').length,
    high: tasks.filter((t) => t.priority === 'high' && t.status !== 'done').length,
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1
            className="text-3xl text-white tracking-widest uppercase"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            Task Board
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            {stats.total} tasks — {stats.inProgress} in progress, {stats.high} urgent
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-ghost ${showFilters || filterAgent || filterPriority ? 'text-brand-amber' : ''}`}
          >
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button onClick={fetchTasks} className="btn-ghost">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setAddModal('todo')} className="btn-primary">
            <Plus className="w-4 h-4" />
            New Task
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'text-zinc-400' },
          { label: 'To Do', value: stats.todo, color: 'text-zinc-400' },
          { label: 'In Progress', value: stats.inProgress, color: 'text-brand-amber' },
          { label: 'Done', value: stats.done, color: 'text-brand-green' },
        ].map((s) => (
          <div key={s.label} className="card py-4 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-zinc-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card mb-6 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-400 font-medium">Agent</label>
            <select
              className="select w-auto text-xs"
              value={filterAgent}
              onChange={(e) => setFilterAgent(e.target.value)}
            >
              <option value="">All</option>
              {AGENTS.map((a) => (
                <option key={a} value={a}>{AGENT_EMOJIS[a]} {a}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-zinc-400 font-medium">Priority</label>
            <select
              className="select w-auto text-xs"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
            >
              <option value="">All</option>
              <option value="high">🔴 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
          </div>
          {(filterAgent || filterPriority) && (
            <button
              onClick={() => { setFilterAgent(''); setFilterPriority('') }}
              className="text-xs text-zinc-500 hover:text-white flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <ArrowRight className="w-3 h-3 text-zinc-600" />
            <span className="text-xs text-zinc-500">{tasks.length} tasks match</span>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      {loading && tasks.length === 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton rounded-xl h-64" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              tasks={getColumnTasks(col.id)}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              onAdd={(status) => setAddModal(status)}
            />
          ))}
        </div>
      )}

      {/* Add Task Modal */}
      {addModal !== null && (
        <AddTaskModal
          defaultStatus={addModal}
          onClose={() => setAddModal(null)}
          onSuccess={fetchTasks}
        />
      )}
    </div>
  )
}
