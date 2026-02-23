'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  DollarSign, Users, Bell, TrendingUp, Plus, ArrowRight,
  CheckCircle2, Circle, Flame, Target, Calendar, BookOpen,
  RefreshCw, UserPlus, Zap,
} from 'lucide-react'
import { format } from 'date-fns'
import type { Client, Goal, Habit, Sale } from '@/types'

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
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-800 transition-colors text-left"
                    >
                      {habit.completed_today ? (
                        <CheckCircle2 className="w-5 h-5 text-brand-green flex-shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-zinc-600 flex-shrink-0" />
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
            </div>
          </div>
        </>
      )}
    </div>
  )
}
