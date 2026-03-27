export const dynamic = 'force-dynamic'
import { NextResponse, NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { isMissingTableError } from '@/lib/supabase-error'

export interface ActivityItem {
  id: string
  type: 'sale' | 'client' | 'habit' | 'goal' | 'content' | 'team' | 'task' | 'health' | 'knowledge'
  title: string
  description?: string
  metadata?: Record<string, unknown>
  timestamp: string
}

export async function GET(request: NextRequest) {
  const auth = await withAuth(request)
  if (!auth.authorized) return auth.response!

  const { searchParams } = new URL(request.url)
  const limit = Math.min(Number(searchParams.get('limit') || 50), 100)
  const typeFilter = searchParams.get('type') // optional: 'sale', 'client', etc.
  const daysBack = Math.min(Number(searchParams.get('days') || 30), 90)

  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()
  const activities: ActivityItem[] = []

  // Fetch from multiple tables in parallel
  const queries = await Promise.allSettled([
    // Sales
    (!typeFilter || typeFilter === 'sale') ? supabaseAdmin
      .from('sales')
      .select('id, product_name, product_category, amount, date, client_name, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(limit) : Promise.resolve({ data: [], error: null }),

    // Clients
    (!typeFilter || typeFilter === 'client') ? supabaseAdmin
      .from('clients')
      .select('id, name, status, source, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(limit) : Promise.resolve({ data: [], error: null }),

    // Habit logs
    (!typeFilter || typeFilter === 'habit') ? supabaseAdmin
      .from('habit_logs')
      .select('id, habit_id, date, completed')
      .eq('completed', true)
      .gte('date', since.split('T')[0])
      .order('date', { ascending: false })
      .limit(limit) : Promise.resolve({ data: [], error: null }),

    // Habits (for names)
    (!typeFilter || typeFilter === 'habit') ? supabaseAdmin
      .from('habits')
      .select('id, title, icon') : Promise.resolve({ data: [], error: null }),

    // Goals
    (!typeFilter || typeFilter === 'goal') ? supabaseAdmin
      .from('goals')
      .select('id, title, category, current_value, target_value, unit, completed, updated_at')
      .gte('updated_at', since)
      .order('updated_at', { ascending: false })
      .limit(limit) : Promise.resolve({ data: [], error: null }),

    // Team activity
    (!typeFilter || typeFilter === 'team') ? supabaseAdmin
      .from('team_activity')
      .select('id, agent_name, action_type, description, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(limit) : Promise.resolve({ data: [], error: null }),

    // Tasks
    (!typeFilter || typeFilter === 'task') ? supabaseAdmin
      .from('tasks')
      .select('id, title, assigned_to, status, priority, updated_at')
      .gte('updated_at', since)
      .order('updated_at', { ascending: false })
      .limit(limit) : Promise.resolve({ data: [], error: null }),

    // Knowledge
    (!typeFilter || typeFilter === 'knowledge') ? supabaseAdmin
      .from('knowledge')
      .select('id, title, type, category, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(limit) : Promise.resolve({ data: [], error: null }),
  ])

  const extract = (result: PromiseSettledResult<any>) => {
    if (result.status === 'rejected') return []
    const { data, error } = result.value
    if (error && !isMissingTableError(error)) return []
    return data || []
  }

  const sales = extract(queries[0])
  const clients = extract(queries[1])
  const habitLogs = extract(queries[2])
  const habits = extract(queries[3])
  const goals = extract(queries[4])
  const teamActs = extract(queries[5])
  const tasks = extract(queries[6])
  const knowledge = extract(queries[7])

  // Map habits by id for lookup
  const habitMap = new Map<string, { title: string; icon: string }>()
  for (const h of habits) {
    habitMap.set(h.id, { title: h.title, icon: h.icon })
  }

  // Transform sales
  for (const s of sales) {
    activities.push({
      id: `sale-${s.id}`,
      type: 'sale',
      title: `Sale: €${Number(s.amount).toFixed(2)}`,
      description: [s.product_name || s.product_category, s.client_name].filter(Boolean).join(' — '),
      metadata: { amount: s.amount, category: s.product_category },
      timestamp: s.created_at,
    })
  }

  // Transform clients
  for (const c of clients) {
    activities.push({
      id: `client-${c.id}`,
      type: 'client',
      title: `New ${c.status}: ${c.name}`,
      description: `Source: ${c.source}`,
      metadata: { status: c.status, source: c.source },
      timestamp: c.created_at,
    })
  }

  // Transform habit logs
  for (const l of habitLogs) {
    const habit = habitMap.get(l.habit_id)
    if (!habit) continue
    activities.push({
      id: `habit-${l.id}`,
      type: 'habit',
      title: `${habit.icon} ${habit.title}`,
      description: 'Habit completed',
      timestamp: `${l.date}T12:00:00Z`,
    })
  }

  // Transform goals
  for (const g of goals) {
    const pct = g.target_value ? Math.round((g.current_value / g.target_value) * 100) : 0
    activities.push({
      id: `goal-${g.id}`,
      type: 'goal',
      title: g.completed ? `✅ Goal completed: ${g.title}` : `Goal update: ${g.title}`,
      description: g.target_value ? `${g.current_value}/${g.target_value} ${g.unit || ''} (${pct}%)` : undefined,
      metadata: { category: g.category, completed: g.completed },
      timestamp: g.updated_at,
    })
  }

  // Transform team activity
  for (const t of teamActs) {
    activities.push({
      id: `team-${t.id}`,
      type: 'team',
      title: `${t.agent_name}: ${t.action_type}`,
      description: t.description,
      metadata: { agent: t.agent_name, action: t.action_type },
      timestamp: t.created_at,
    })
  }

  // Transform tasks
  for (const t of tasks) {
    const statusLabel = t.status === 'done' ? '✅ Done' : t.status === 'in_progress' ? '🔄 In Progress' : '📋 Todo'
    activities.push({
      id: `task-${t.id}`,
      type: 'task',
      title: `${statusLabel}: ${t.title}`,
      description: t.assigned_to ? `Assigned to ${t.assigned_to}` : undefined,
      metadata: { status: t.status, priority: t.priority, assigned_to: t.assigned_to },
      timestamp: t.updated_at,
    })
  }

  // Transform knowledge
  for (const k of knowledge) {
    activities.push({
      id: `knowledge-${k.id}`,
      type: 'knowledge',
      title: `📚 ${k.title}`,
      description: `${k.type} — ${k.category}`,
      metadata: { type: k.type, category: k.category },
      timestamp: k.created_at,
    })
  }

  // Sort by timestamp descending, limit
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return NextResponse.json({
    activities: activities.slice(0, limit),
    total: activities.length,
  })
}
