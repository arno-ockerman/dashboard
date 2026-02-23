import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

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
      { data: salesThisMonth },
      { count: activeClients },
      { data: followUps },
      { count: newLeads },
      { data: goals },
      { data: habits },
      { data: habitLogs },
      { data: recentSales },
      { data: recentClients },
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
    ])

    const revenue = salesThisMonth?.reduce((sum, s) => sum + Number(s.amount), 0) || 0

    const habitsWithStatus = habits?.map((h) => ({
      ...h,
      completed_today: habitLogs?.some((l) => l.habit_id === h.id && l.completed) ?? false,
    }))

    return NextResponse.json({
      revenue_this_month: revenue,
      revenue_target: 5000,
      active_clients: activeClients || 0,
      follow_ups_today: followUps?.length || 0,
      new_leads_this_week: newLeads || 0,
      sales_this_month: salesThisMonth?.length || 0,
      follow_ups: followUps?.slice(0, 5) || [],
      goals: goals?.slice(0, 4) || [],
      habits: habitsWithStatus || [],
      recent_sales: recentSales || [],
      recent_clients: recentClients || [],
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
