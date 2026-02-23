export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { completed, date } = await request.json()
    const today = date || new Date().toISOString().split('T')[0]

    // Upsert habit log
    const { error: logError } = await supabaseAdmin
      .from('habit_logs')
      .upsert(
        { habit_id: params.id, date: today, completed },
        { onConflict: 'habit_id,date' }
      )

    if (logError) throw logError

    // Update streak
    if (completed) {
      const { data: habit } = await supabaseAdmin
        .from('habits')
        .select('streak')
        .eq('id', params.id)
        .single()

      await supabaseAdmin
        .from('habits')
        .update({ streak: (habit?.streak || 0) + 1 })
        .eq('id', params.id)
    } else {
      await supabaseAdmin
        .from('habits')
        .update({ streak: 0 })
        .eq('id', params.id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
