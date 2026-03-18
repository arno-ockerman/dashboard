export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const auth = await withAuth(request)
  if (!auth.authorized) return auth.response!
  try {
    const today = new Date().toISOString().split('T')[0]

    const { data: habits, error } = await supabaseAdmin
      .from('habits')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: true })

    if (error) throw error

    // Get today's logs
    const { data: logs } = await supabaseAdmin
      .from('habit_logs')
      .select('*')
      .eq('date', today)

    const habitsWithLogs = habits?.map((habit) => ({
      ...habit,
      completed_today: logs?.some((l) => l.habit_id === habit.id && l.completed) ?? false,
    }))

    return NextResponse.json(habitsWithLogs)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await withAuth(request)
  if (!auth.authorized) return auth.response!
  try {
    const body = await request.json()
    const { data, error } = await supabaseAdmin
      .from('habits')
      .insert(body)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
