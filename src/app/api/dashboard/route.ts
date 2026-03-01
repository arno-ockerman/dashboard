export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { formatSupabaseError, isMissingTableError } from '@/lib/supabase-error'

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0]
    const thisMonthStart = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    ).toISOString().split('T')[0]
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const [
      salesThisMonthRes,
      activeClientsRes,
      followUpsRes,
      newLeadsRes,
      goalsRes,
      habitsRes,
      habitLogsRes,
      recentSalesRes,
      recentClientsRes,
      revenueTargetRes,
      tasksCountRes,
      teamActivityRes,
    ] = await Promise.all([
      supabaseAdmin.from('sales').select('amount').gte('date', thisMonthStart),
      supabaseAdmin.from('clients').select('*', { count: 'exact', head: true }).in('status', ['client', 'prospect', 'team_member']),
      supabaseAdmin.from('clients').select('*').lte('next_follow_up', today).neq('status', 'inactive').order('next_follow_up'),
      supabaseAdmin.from('clients').select('*', { count: 'exact', head: true }).eq('status', 'lead').gte('created_at', weekAgo),
      supabaseAdmin.from('goals').select('*').eq('completed', false).order('deadline'),
      supabaseAdmin.from('habits').select('*').eq('active', true),
      supabaseAdmin.from('habit_logs').select('*').eq('date', today),
      supabaseAdmin.from('sales').select('*').order('created_at', { ascending: false }).limit(5),
      supabaseAdmin.from('clients').select('*').order('created_at', { ascending: false }).limit(5),
      supabaseAdmin.from('dashboard_settings').select('value').eq('key', 'revenue_target').maybeSingle(),
      supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('team_activity').select('*').order('created_at', { ascending: false }).limit(10),
    ])

    const warnings: string[] = []

    const salesThisMonth = salesThisMonthRes.error
      ? (isMissingTableError(salesThisMonthRes.error) ? [] : (warnings.push(`sales: ${formatSupabaseError(salesThisMonthRes.error)}`), []))
      : (salesThisMonthRes.data || [])

    const activeClients = activeClientsRes.error
      ? (isMissingTableError(activeClientsRes.error) ? 0 : (warnings.push(`clients(count): ${formatSupabaseError(activeClientsRes.error)}`), 0))
      : (activeClientsRes.count || 0)

    const followUps = followUpsRes.error
      ? (isMissingTableError(followUpsRes.error) ? [] : (warnings.push(`clients(followups): ${formatSupabaseError(followUpsRes.error)}`), []))
      : (followUpsRes.data || [])

    const newLeads = newLeadsRes.error
      ? (isMissingTableError(newLeadsRes.error) ? 0 : (warnings.push(`clients(leads): ${formatSupabaseError(newLeadsRes.error)}`), 0))
      : (newLeadsRes.count || 0)

    const goals = goalsRes.error
      ? (isMissingTableError(goalsRes.error) ? [] : (warnings.push(`goals: ${formatSupabaseError(goalsRes.error)}`), []))
      : (goalsRes.data || [])

    const habits = habitsRes.error
      ? (isMissingTableError(habitsRes.error) ? [] : (warnings.push(`habits: ${formatSupabaseError(habitsRes.error)}`), []))
      : (habitsRes.data || [])

    const habitLogs = habitLogsRes.error
      ? (isMissingTableError(habitLogsRes.error) ? [] : (warnings.push(`habit_logs: ${formatSupabaseError(habitLogsRes.error)}`), []))
      : (habitLogsRes.data || [])

    const recentSales = recentSalesRes.error
      ? (isMissingTableError(recentSalesRes.error) ? [] : (warnings.push(`sales(recent): ${formatSupabaseError(recentSalesRes.error)}`), []))
      : (recentSalesRes.data || [])

    const recentClients = recentClientsRes.error
      ? (isMissingTableError(recentClientsRes.error) ? [] : (warnings.push(`clients(recent): ${formatSupabaseError(recentClientsRes.error)}`), []))
      : (recentClientsRes.data || [])

    const revenueTarget = revenueTargetRes.error
      ? (isMissingTableError(revenueTargetRes.error) ? 5000 : (warnings.push(`dashboard_settings: ${formatSupabaseError(revenueTargetRes.error)}`), 5000))
      : (typeof revenueTargetRes.data?.value === 'number' ? revenueTargetRes.data.value : Number(revenueTargetRes.data?.value) || 5000)

    const tasksCount = tasksCountRes.error
      ? (isMissingTableError(tasksCountRes.error) ? 0 : (warnings.push(`tasks(count): ${formatSupabaseError(tasksCountRes.error)}`), 0))
      : (tasksCountRes.count || 0)

    const recentTeamActivity = teamActivityRes.error
      ? (isMissingTableError(teamActivityRes.error) ? [] : (warnings.push(`team_activity: ${formatSupabaseError(teamActivityRes.error)}`), []))
      : (teamActivityRes.data || [])

    const revenue = salesThisMonth.reduce((sum, s: any) => sum + Number(s.amount), 0) || 0

    const habitsWithStatus = habits.map((h: any) => ({
      ...h,
      completed_today: habitLogs.some((l: any) => l.habit_id === h.id && l.completed) ?? false,
    }))

    return NextResponse.json({
      revenue_this_month: revenue,
      revenue_target: revenueTarget,
      active_clients: activeClients,
      follow_ups_today: followUps.length || 0,
      new_leads_this_week: newLeads,
      sales_this_month: salesThisMonth.length || 0,
      follow_ups: followUps.slice(0, 5) || [],
      goals: goals.slice(0, 4) || [],
      habits: habitsWithStatus || [],
      recent_sales: recentSales || [],
      recent_clients: recentClients || [],
      tasks_count: tasksCount,
      recent_team_activity: recentTeamActivity,
      warnings: warnings.length ? warnings : undefined,
    })
  } catch (error) {
    return NextResponse.json({ error: formatSupabaseError(error) }, { status: 500 })
  }
}
