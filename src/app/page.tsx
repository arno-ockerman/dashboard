'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  DollarSign, Users, Bell, TrendingUp, Plus, ArrowRight,
  CheckCircle2, Circle, Flame, Target, Calendar, BookOpen,
  RefreshCw, UserPlus, Zap, Crosshair, Bot, ListTodo, Folder, Clock,
  Settings,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import type { Client, Goal, Habit, Sale, Task, Project, TeamActivity } from '@/types'

// ─── Big 3 Widget types ───────────────────────────────────────────────────────
interface FocusData {
  task_1: string | null
  task_1_done: boolean
  task_2: string | null
  task_2_done: boolean
  task_3: string | null
  task_3_done: boolean
}

function Big3Widget() {
  const [focus, setFocus] = useState<FocusData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    fetch(`/api/focus?date=${today}`)
      .then((r) => r.json())
      .then((d) => setFocus(d.focus || null))
      .finally(() => setLoading(false))
  }, [])

  const tasks = focus
    ? [
        { text: focus.task_1, done: focus.task_1_done },
        { text: focus.task_2, done: focus.task_2_done },
        { text: focus.task_3, done: focus.task_3_done },
      ].filter((t) => t.text)
    : []

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-brand-burgundy" />
          Today&apos;s Big 3
        </h2>
        <Link
          href="/focus"
          className="text-xs text-zinc-500 hover:text-white flex items-center gap-1"
        >
          Focus page <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-8 rounded-lg" />)}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-zinc-500 text-sm mb-3">No tasks set for today</p>
          <Link href="/focus" className="btn-primary mx-auto text-xs">
            <Crosshair className="w-3 h-3" /> Set Your Big 3
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((t, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg">
              {t.done ? (
                <CheckCircle2 className="w-5 h-5 text-brand-green flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-zinc-600 flex-shrink-0" />
              )}
              <span className={`text-sm flex-1 ${t.done ? 'text-zinc-500 line-through' : 'text-white'}`}>
                {t.text}
              </span>
            </div>
          ))}
          <div className="mt-3 pt-3 border-t border-zinc-800">
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-burgundy rounded-full transition-all duration-500"
                style={{ width: `${tasks.length ? (tasks.filter((t) => t.done).length / tasks.length) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              {tasks.filter((t) => t.done).length}/{tasks.length} completed
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Team Status Widget ───────────────────────────────────────────────────────

const AGENT_EMOJIS: Record<string, string> = {
  Jarvis: '🧠', Mike: '⚡', Kate: '✍️', Steve: '🔍', Alex: '📈',
}
const AGENT_NAMES = ['Jarvis', 'Mike', 'Kate', 'Steve', 'Alex']

function TeamStatusWidget() {
  const [activities, setActivities] = useState<TeamActivity[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetch('/api/team'), fetch('/api/tasks')])
      .then(async ([teamRes, tasksRes]) => {
        const teamData = await teamRes.json()
        const tasksData = await tasksRes.json()
        setActivities(teamData.activities || [])
        setTasks(tasksData.tasks || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <Bot className="w-4 h-4 text-brand-burgundy" />
          AI Team Status
        </h2>
        <Link href="/team" className="text-xs text-zinc-500 hover:text-white flex items-center gap-1">
          Team page <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      {loading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="skeleton h-8 rounded-lg" />)}</div>
      ) : (
        <div className="space-y-2">
          {AGENT_NAMES.map((name) => {
            const activeTask = tasks.find(t => t.assigned_to === name && t.status === 'in_progress')
            const lastAction = activities.find(a => a.agent_name === name)
            const taskCount = tasks.filter(t => t.assigned_to === name && t.status !== 'done').length
            return (
              <div key={name} className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-800/50">
                <span className="text-lg">{AGENT_EMOJIS[name]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{name}</span>
                    {activeTask && <div className="w-1.5 h-1.5 bg-brand-burgundy rounded-full animate-pulse" />}
                  </div>
                  <p className="text-xs text-zinc-500 truncate">
                    {activeTask ? activeTask.title : lastAction ? lastAction.description : 'Idle'}
                  </p>
                </div>
                <span className="text-xs text-zinc-600 flex-shrink-0">{taskCount} tasks</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Recent Tasks Widget ──────────────────────────────────────────────────────

function RecentTasksWidget() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/tasks')
      .then(r => r.json())
      .then(d => setTasks((d.tasks || []).slice(0, 5)))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const priorityDot: Record<string, string> = { high: '🔴', medium: '🟡', low: '🟢' }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-brand-green" />
          Recent Tasks
        </h2>
        <Link href="/tasks" className="text-xs text-zinc-500 hover:text-white flex items-center gap-1">
          Task board <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-10 rounded-lg" />)}</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-zinc-500 text-sm mb-3">No tasks yet</p>
          <Link href="/tasks" className="btn-primary mx-auto text-xs"><Plus className="w-3 h-3" /> Add Task</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => (
            <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800 transition-colors">
              <span className="text-xs">{priorityDot[task.priority]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{task.title}</p>
                {task.assigned_to && (
                  <p className="text-xs text-zinc-500">{AGENT_EMOJIS[task.assigned_to]} {task.assigned_to}</p>
                )}
              </div>
              <span className={`badge text-xs ${
                task.status === 'done' ? 'bg-brand-green/20 text-emerald-400' :
                task.status === 'in_progress' ? 'bg-amber-900/20 text-amber-400' :
                'bg-zinc-800 text-zinc-400'
              }`}>
                {task.status === 'in_progress' ? 'Active' : task.status === 'done' ? 'Done' : 'Todo'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Project Status Widget ────────────────────────────────────────────────────

function ProjectStatusWidget() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(d => setProjects(d.projects || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const statusColors: Record<string, string> = {
    active: 'text-emerald-400',
    paused: 'text-amber-400',
    completed: 'text-blue-400',
    planning: 'text-purple-400',
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <Folder className="w-4 h-4 text-brand-amber" />
          Projects
        </h2>
        <Link href="/projects" className="text-xs text-zinc-500 hover:text-white flex items-center gap-1">
          All projects <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      {loading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="skeleton h-10 rounded-lg" />)}</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-zinc-500 text-sm">No projects found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map(project => (
            <div key={project.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-800/50">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{project.name}</p>
                <p className="text-xs text-zinc-600 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDistanceToNow(new Date(project.last_update), { addSuffix: true })}
                </p>
              </div>
              <span className={`text-xs font-medium capitalize ${statusColors[project.status] || 'text-zinc-400'}`}>
                {project.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Upcoming Content Widget ──────────────────────────────────────────────────

interface ContentPost {
  id: string
  title: string
  platform: string
  post_type: string
  status: string
  scheduled_date: string | null
}

const PLATFORM_ICONS: Record<string, string> = {
  instagram: '📸',
  facebook: '👥',
  tiktok: '🎵',
  linkedin: '💼',
}

const STATUS_COLORS: Record<string, string> = {
  idea: 'text-zinc-400',
  draft: 'text-amber-400',
  scheduled: 'text-blue-400',
  published: 'text-emerald-400',
}

function UpcomingContentWidget() {
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const future = format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
    fetch(`/api/content-posts?week_start=${today}&week_end=${future}&limit=3`)
      .then((r) => r.json())
      .then((d) => setPosts(Array.isArray(d) ? d.slice(0, 3) : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-white flex items-center gap-2">
          <Calendar className="w-4 h-4 text-brand-amber" />
          Aankomende Content
        </h2>
        <Link href="/content" className="text-xs text-zinc-500 hover:text-white flex items-center gap-1">
          Content planner <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-10 rounded-lg" />)}</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-zinc-500 text-sm mb-3">Geen content gepland</p>
          <Link href="/content?modal=add" className="btn-primary mx-auto text-xs">
            <Plus className="w-3 h-3" /> Content Plannen
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <div key={post.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-zinc-800/50">
              <span className="text-lg flex-shrink-0">{PLATFORM_ICONS[post.platform] || '📱'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{post.title}</p>
                <p className="text-xs text-zinc-500">{post.post_type}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-xs font-medium ${STATUS_COLORS[post.status] || 'text-zinc-400'}`}>
                  {post.status === 'scheduled' ? 'Gepland' : post.status === 'draft' ? 'Concept' : post.status === 'published' ? '✓' : 'Idee'}
                </p>
                {post.scheduled_date && (
                  <p className="text-xs text-zinc-600">{format(new Date(post.scheduled_date), 'dd MMM')}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Dashboard Data Types ─────────────────────────────────────────────────────

interface DashboardData {
  revenue_this_month: number
  revenue_target: number
  active_clients: number
  follow_ups_today: number
  new_leads_this_week: number
  sales_this_month: number
  follow_ups: Client[]
  goals: Goal[]
  habits: Habit[]
  recent_sales: Sale[]
  recent_clients: Client[]
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  href,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color: string
  href?: string
}) {
  const content = (
    <div className="card flex items-start gap-4 hover:border-zinc-700 transition-all duration-200">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-zinc-400 text-sm">{label}</p>
        <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
        {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
      </div>
    </div>
  )
  if (href) return <Link href={href}>{content}</Link>
  return content
}

const statusColors: Record<string, string> = {
  lead: 'bg-zinc-700 text-zinc-300',
  prospect: 'bg-blue-900/50 text-blue-300',
  client: 'bg-green-900/50 text-green-300',
  team_member: 'bg-brand-burgundy/30 text-red-300',
  inactive: 'bg-zinc-800 text-zinc-500',
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [togglingHabit, setTogglingHabit] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard')
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const toggleHabit = async (habitId: string, completed: boolean) => {
    setTogglingHabit(habitId)
    try {
      await fetch(`/api/habits/${habitId}/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed }),
      })
      await fetchData()
    } finally {
      setTogglingHabit(null)
    }
  }

  const revenue = data?.revenue_this_month || 0
  const target = data?.revenue_target || 5000
  const revenueProgress = Math.min((revenue / target) * 100, 100)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-3xl text-white tracking-widest uppercase"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            Command Center
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            {format(new Date(), 'EEEE, MMMM d, yyyy')} — Make It Happen
          </p>
        </div>
        <button
          onClick={fetchData}
          className="btn-ghost"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card skeleton h-24" />
          ))}
        </div>
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={DollarSign}
              label="Revenue This Month"
              value={`€${revenue.toFixed(0)}`}
              sub={`${Math.round(revenueProgress)}% of €${target} target`}
              color="bg-brand-burgundy/20 text-brand-burgundy"
              href="/sales"
            />
            <StatCard
              icon={Users}
              label="Active Clients"
              value={data?.active_clients || 0}
              sub="prospects + clients + team"
              color="bg-brand-green/20 text-brand-green"
              href="/clients"
            />
            <StatCard
              icon={Bell}
              label="Follow-ups Today"
              value={data?.follow_ups_today || 0}
              sub="need your attention"
              color="bg-amber-900/30 text-amber-400"
            />
            <StatCard
              icon={TrendingUp}
              label="New Leads"
              value={data?.new_leads_this_week || 0}
              sub="this week"
              color="bg-blue-900/30 text-blue-400"
              href="/clients"
            />
          </div>

          {/* Revenue progress */}
          <div className="card mb-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm text-zinc-400">Monthly Revenue Progress</p>
                <p className="text-xl font-bold text-white">€{revenue.toFixed(2)} <span className="text-zinc-500 text-sm font-normal">/ €{target}</span></p>
              </div>
              <Link href="/sales" className="text-brand-burgundy text-sm hover:underline flex items-center gap-1">
                View Sales <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-burgundy to-brand-burgundy-light rounded-full transition-all duration-700"
                style={{ width: `${revenueProgress}%` }}
              />
            </div>
            <p className="text-xs text-zinc-500 mt-2">{data?.sales_this_month || 0} sales logged this month</p>
          </div>

          {/* Big 3 Widget */}
          <div className="mb-6">
            <Big3Widget />
          </div>

          {/* AI Team Widgets */}
          <div className="grid lg:grid-cols-3 gap-6 mb-6">
            <TeamStatusWidget />
            <RecentTasksWidget />
            <ProjectStatusWidget />
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Follow-ups */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-white flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-400" />
                  Follow-ups Today
                </h2>
                <Link href="/clients" className="text-xs text-zinc-500 hover:text-white flex items-center gap-1">
                  All clients <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {data?.follow_ups && data.follow_ups.length > 0 ? (
                <div className="space-y-3">
                  {data.follow_ups.map((client) => (
                    <Link
                      key={client.id}
                      href={`/clients/${client.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-full bg-brand-green/20 flex items-center justify-center text-sm font-bold text-brand-green flex-shrink-0">
                        {client.name[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{client.name}</p>
                        <p className="text-xs text-zinc-500 truncate">{client.next_action || 'Follow up needed'}</p>
                      </div>
                      <span className={`badge ${statusColors[client.status]} flex-shrink-0`}>
                        {client.status}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-8 h-8 text-brand-green mx-auto mb-2" />
                  <p className="text-zinc-400 text-sm">All caught up! 🎉</p>
                </div>
              )}
            </div>

            {/* Habits */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  Daily Habits
                </h2>
                <Link href="/goals" className="text-xs text-zinc-500 hover:text-white flex items-center gap-1">
                  All habits <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {data?.habits && data.habits.length > 0 ? (
                <div className="space-y-2">
                  {data.habits.map((habit) => (
                    <button
                      key={habit.id}
                      onClick={() => toggleHabit(habit.id, habit.completed_today ?? false)}
                      disabled={togglingHabit === habit.id}
                      className="w-full flex items-center gap-3 p-3 min-h-[52px] rounded-xl hover:bg-zinc-800 transition-colors text-left active:scale-[0.99] touch-manipulation"
                    >
                      {habit.completed_today ? (
                        <CheckCircle2 className="w-6 h-6 text-brand-green flex-shrink-0" />
                      ) : (
                        <Circle className="w-6 h-6 text-zinc-600 flex-shrink-0" />
                      )}
                      <span className={`text-sm flex-1 ${habit.completed_today ? 'text-zinc-400 line-through' : 'text-white'}`}>
                        {habit.icon} {habit.title}
                      </span>
                      {habit.streak > 0 && (
                        <span className="text-xs text-orange-400 flex items-center gap-1">
                          🔥 {habit.streak}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Link href="/goals" className="btn-primary mx-auto">
                    <Plus className="w-4 h-4" /> Add Habits
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Goals + Recent Clients + Upcoming Content */}
          <div className="grid lg:grid-cols-3 gap-6 mb-6">
            <UpcomingContentWidget />
          </div>

          {/* Goals + Recent Activity */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Goals */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-white flex items-center gap-2">
                  <Target className="w-4 h-4 text-brand-burgundy" />
                  Active Goals
                </h2>
                <Link href="/goals" className="text-xs text-zinc-500 hover:text-white flex items-center gap-1">
                  All goals <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {data?.goals && data.goals.length > 0 ? (
                <div className="space-y-4">
                  {data.goals.map((goal) => {
                    const progress = goal.target_value
                      ? Math.min((goal.current_value / goal.target_value) * 100, 100)
                      : 0
                    return (
                      <div key={goal.id}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm text-white font-medium truncate flex-1">{goal.title}</span>
                          <span className="text-xs text-zinc-500 ml-2 flex-shrink-0">
                            {goal.current_value}/{goal.target_value} {goal.unit}
                          </span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${progress}%`,
                              background: goal.category === 'business'
                                ? '#620E06'
                                : goal.category === 'fitness'
                                ? '#425C59'
                                : '#D5CBBA',
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Link href="/goals" className="btn-primary mx-auto">
                    <Plus className="w-4 h-4" /> Set Goals
                  </Link>
                </div>
              )}
            </div>

            {/* Recent Clients */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-brand-green" />
                  Recent Clients
                </h2>
                <Link href="/clients" className="text-xs text-zinc-500 hover:text-white flex items-center gap-1">
                  All clients <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              {data?.recent_clients && data.recent_clients.length > 0 ? (
                <div className="space-y-2">
                  {data.recent_clients.map((c) => (
                    <Link
                      key={c.id}
                      href={`/clients/${c.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-brand-green/20 flex items-center justify-center text-sm font-bold text-brand-green flex-shrink-0">
                        {c.name[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{c.name}</p>
                        <p className="text-xs text-zinc-500">{format(new Date(c.created_at), 'MMM d')}</p>
                      </div>
                      <span className={`badge ${statusColors[c.status]}`}>{c.status}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-zinc-500 text-sm mb-3">No clients yet</p>
                  <Link href="/clients" className="btn-primary mx-auto">
                    <UserPlus className="w-4 h-4" /> Add Client
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-brand-amber" />
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              <Link href="/team" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-brand-burgundy/10 hover:bg-brand-burgundy/20 transition-colors text-center border border-brand-burgundy/30">
                <Bot className="w-6 h-6 text-brand-burgundy" />
                <span className="text-xs text-zinc-300">AI Team</span>
              </Link>
              <Link href="/tasks" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors text-center">
                <ListTodo className="w-6 h-6 text-brand-green" />
                <span className="text-xs text-zinc-300">Tasks</span>
              </Link>
              <Link href="/projects" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors text-center">
                <Folder className="w-6 h-6 text-amber-400" />
                <span className="text-xs text-zinc-300">Projects</span>
              </Link>
              <Link href="/clients?modal=add" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors text-center">
                <UserPlus className="w-6 h-6 text-brand-green" />
                <span className="text-xs text-zinc-300">Add Client</span>
              </Link>
              <Link href="/sales?modal=add" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors text-center">
                <DollarSign className="w-6 h-6 text-brand-burgundy" />
                <span className="text-xs text-zinc-300">Log Sale</span>
              </Link>
              <Link href="/knowledge?modal=add" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors text-center">
                <BookOpen className="w-6 h-6 text-blue-400" />
                <span className="text-xs text-zinc-300">Save Link</span>
              </Link>
              <Link href="/content?modal=add" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors text-center">
                <Calendar className="w-6 h-6 text-brand-amber" />
                <span className="text-xs text-zinc-300">Plan Content</span>
              </Link>
              <Link href="/settings" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 transition-colors text-center">
                <Settings className="w-6 h-6 text-zinc-400" />
                <span className="text-xs text-zinc-300">Instellingen</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
