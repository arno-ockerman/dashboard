'use client'

import { useEffect, useState } from 'react'
import {
  Users, Zap, GitCommit, GitPullRequest, Rocket,
  CheckCircle2, MessageSquare, Plus, X, Send, RefreshCw,
  Clock, Activity,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import type { TeamActivity, Task } from '@/types'

// ─── Agent Definitions ────────────────────────────────────────────────────────

const AGENTS = [
  {
    name: 'Jarvis',
    emoji: '🧠',
    role: 'Chief Orchestrator',
    model: 'Claude Opus 4.6',
    color: 'burgundy',
    bgClass: 'bg-brand-burgundy/20 border-brand-burgundy/40',
    textClass: 'text-brand-burgundy',
    dotClass: 'bg-brand-burgundy',
  },
  {
    name: 'Mike',
    emoji: '⚡',
    role: 'Senior Developer',
    model: 'GPT Codex 5.3',
    color: 'blue',
    bgClass: 'bg-blue-900/20 border-blue-700/40',
    textClass: 'text-blue-400',
    dotClass: 'bg-blue-400',
  },
  {
    name: 'Kate',
    emoji: '✍️',
    role: 'Content & Creative',
    model: 'Claude Opus 4.6',
    color: 'purple',
    bgClass: 'bg-purple-900/20 border-purple-700/40',
    textClass: 'text-purple-400',
    dotClass: 'bg-purple-400',
  },
  {
    name: 'Steve',
    emoji: '🔍',
    role: 'Research & Analysis',
    model: 'Gemini 3.1 Pro',
    color: 'green',
    bgClass: 'bg-brand-green/20 border-brand-green/40',
    textClass: 'text-emerald-400',
    dotClass: 'bg-emerald-400',
  },
  {
    name: 'Alex',
    emoji: '📈',
    role: 'Growth & Strategy',
    model: 'Gemini 2.5 Pro',
    color: 'amber',
    bgClass: 'bg-amber-900/20 border-amber-700/40',
    textClass: 'text-amber-400',
    dotClass: 'bg-amber-400',
  },
]

const ACTION_ICONS: Record<string, React.ElementType> = {
  commit: GitCommit,
  pr: GitPullRequest,
  deploy: Rocket,
  task_complete: CheckCircle2,
  message: MessageSquare,
}

const ACTION_COLORS: Record<string, string> = {
  commit: 'text-blue-400',
  pr: 'text-purple-400',
  deploy: 'text-emerald-400',
  task_complete: 'text-brand-green',
  message: 'text-brand-amber',
}

// ─── Assign Task Modal ────────────────────────────────────────────────────────

interface AssignTaskModalProps {
  defaultAgent?: string
  onClose: () => void
  onSuccess: () => void
}

function AssignTaskModal({ defaultAgent, onClose, onSuccess }: AssignTaskModalProps) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    assigned_to: defaultAgent || '',
    priority: 'medium' as 'high' | 'medium' | 'low',
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
            Assign Task
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Task Title *</label>
            <input
              className="input"
              placeholder="What needs to be done?"
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
              placeholder="More details..."
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
                <option value="">— Select Agent —</option>
                {AGENTS.map((a) => (
                  <option key={a.name} value={a.name}>
                    {a.emoji} {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Priority</label>
              <select
                className="select"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as 'high' | 'medium' | 'low' })}
              >
                <option value="high">🔴 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 font-medium mb-1.5 block">Project</label>
            <select
              className="select"
              value={form.project}
              onChange={(e) => setForm({ ...form, project: e.target.value })}
            >
              <option value="">— No Project —</option>
              <option value="Make It Happen">Make It Happen</option>
              <option value="Club App">Club App</option>
              <option value="Dashboard">Dashboard</option>
              <option value="beinspiredbyus.be">beinspiredbyus.be</option>
            </select>
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-900/20 border border-red-900/40 rounded-lg p-3">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">
              {submitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Assign Task
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Agent Card ───────────────────────────────────────────────────────────────

interface AgentCardProps {
  agent: typeof AGENTS[0]
  recentTask?: Task
  activityCount: number
  onAssign: (agentName: string) => void
}

function AgentCard({ agent, recentTask, activityCount, onAssign }: AgentCardProps) {
  const isActive = recentTask && recentTask.status === 'in_progress'

  return (
    <div className={`card border ${agent.bgClass} hover:border-opacity-70 transition-all duration-200`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{agent.emoji}</div>
          <div>
            <h3 className="font-bold text-white text-base">{agent.name}</h3>
            <p className="text-zinc-400 text-xs">{agent.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isActive ? agent.dotClass : 'bg-zinc-600'} ${isActive ? 'animate-pulse' : ''}`} />
          <span className={`text-xs font-medium ${isActive ? agent.textClass : 'text-zinc-500'}`}>
            {isActive ? 'Active' : 'Idle'}
          </span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2">
          <Zap className={`w-3 h-3 ${agent.textClass} flex-shrink-0`} />
          <span className="text-xs text-zinc-400">{agent.model}</span>
        </div>
        <div className="flex items-center gap-2">
          <Activity className={`w-3 h-3 ${agent.textClass} flex-shrink-0`} />
          <span className="text-xs text-zinc-400">{activityCount} recent actions</span>
        </div>
        {recentTask && (
          <div className="flex items-start gap-2">
            <Clock className={`w-3 h-3 ${agent.textClass} flex-shrink-0 mt-0.5`} />
            <span className="text-xs text-zinc-400 truncate">{recentTask.title}</span>
          </div>
        )}
      </div>

      {!recentTask && (
        <p className="text-xs text-zinc-600 mb-4 italic">No active task</p>
      )}

      <button
        onClick={() => onAssign(agent.name)}
        className={`w-full text-xs py-2 px-3 rounded-lg border transition-colors duration-200 font-medium
          ${agent.bgClass} ${agent.textClass} hover:brightness-125`}
      >
        <Plus className="w-3 h-3 inline mr-1" />
        Assign Task
      </button>
    </div>
  )
}

// ─── Main Team Page ───────────────────────────────────────────────────────────

export default function TeamPage() {
  const [activities, setActivities] = useState<TeamActivity[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [assignModal, setAssignModal] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [teamRes, tasksRes] = await Promise.all([
        fetch('/api/team'),
        fetch('/api/tasks'),
      ])
      const teamData = await teamRes.json()
      const tasksData = await tasksRes.json()
      setActivities(teamData.activities || [])
      setTasks(tasksData.tasks || [])
    } catch (err) {
      console.error('Failed to load team data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const getAgentTask = (agentName: string) => {
    return tasks.find(
      (t) => t.assigned_to === agentName && t.status === 'in_progress'
    ) || tasks.find((t) => t.assigned_to === agentName && t.status === 'todo')
  }

  const getAgentActivityCount = (agentName: string) => {
    return activities.filter((a) => a.agent_name === agentName).length
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
            Team Werkplaats
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            AI agent overview — {AGENTS.length} agents active
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchData} className="btn-ghost">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setAssignModal('')} className="btn-primary">
            <Plus className="w-4 h-4" />
            Assign Task
          </button>
        </div>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        {AGENTS.map((agent) => (
          <AgentCard
            key={agent.name}
            agent={agent}
            recentTask={getAgentTask(agent.name)}
            activityCount={getAgentActivityCount(agent.name)}
            onAssign={(name) => setAssignModal(name)}
          />
        ))}
      </div>

      {/* Activity Feed */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-burgundy" />
              Activity Feed
            </h2>
            <span className="text-xs text-zinc-500">{activities.length} actions</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton h-16 rounded-lg" />
              ))}
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm">No activity yet</p>
              <p className="text-zinc-600 text-xs mt-1">Activity will appear here as the team works</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => {
                const agent = AGENTS.find((a) => a.name === activity.agent_name)
                const Icon = ACTION_ICONS[activity.action_type] || Activity
                const iconColor = ACTION_COLORS[activity.action_type] || 'text-zinc-400'

                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                  >
                    <div className="text-xl flex-shrink-0">{agent?.emoji || '🤖'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold ${agent?.textClass || 'text-white'}`}>
                          {activity.agent_name}
                        </span>
                        <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
                        <span className="text-xs text-zinc-500 capitalize">
                          {activity.action_type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-300 truncate mt-0.5">
                        {activity.description || 'No description'}
                      </p>
                      {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                        <div className="flex gap-2 mt-1 flex-wrap">
                          {Object.entries(activity.metadata).map(([k, v]) => (
                            <span key={k} className="text-xs text-zinc-600">
                              {k}: <span className="text-zinc-500">{String(v)}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-zinc-600 flex-shrink-0">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Team Summary */}
        <div className="space-y-4">
          <div className="card">
            <h2 className="font-semibold text-white flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-brand-green" />
              Team Summary
            </h2>
            <div className="space-y-3">
              {AGENTS.map((agent) => {
                const agentTasks = tasks.filter((t) => t.assigned_to === agent.name)
                const inProgress = agentTasks.filter((t) => t.status === 'in_progress').length
                const done = agentTasks.filter((t) => t.status === 'done').length
                const todo = agentTasks.filter((t) => t.status === 'todo').length

                return (
                  <div key={agent.name} className="flex items-center gap-3">
                    <div className="text-lg w-8 text-center">{agent.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-white">{agent.name}</span>
                        <span className="text-xs text-zinc-500">{agentTasks.length} tasks</span>
                      </div>
                      <div className="flex gap-1">
                        {todo > 0 && (
                          <span className="text-xs bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded">
                            {todo} todo
                          </span>
                        )}
                        {inProgress > 0 && (
                          <span className={`text-xs ${agent.bgClass} ${agent.textClass} px-1.5 py-0.5 rounded border`}>
                            {inProgress} active
                          </span>
                        )}
                        {done > 0 && (
                          <span className="text-xs bg-brand-green/20 text-emerald-400 px-1.5 py-0.5 rounded">
                            {done} done
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="card">
            <h2 className="font-semibold text-white mb-3 text-sm">Quick Assign</h2>
            <div className="space-y-2">
              {AGENTS.map((agent) => (
                <button
                  key={agent.name}
                  onClick={() => setAssignModal(agent.name)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all ${agent.bgClass} hover:brightness-125`}
                >
                  <span className="text-base">{agent.emoji}</span>
                  <span className={`text-xs font-medium ${agent.textClass}`}>{agent.name}</span>
                  <Plus className={`w-3 h-3 ${agent.textClass} ml-auto`} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Assign Task Modal */}
      {assignModal !== null && (
        <AssignTaskModal
          defaultAgent={assignModal}
          onClose={() => setAssignModal(null)}
          onSuccess={fetchData}
        />
      )}
    </div>
  )
}
