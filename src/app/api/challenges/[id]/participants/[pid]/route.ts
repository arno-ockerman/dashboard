export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; pid: string } }
) {
  const auth = await withAuth(req)
  if (!auth.authorized) return auth.response!

  try {
    const body = await req.json()
    const { action, ...rest } = body

    let updates: Record<string, unknown> = { ...rest }

    // Special action: checkin — mark today as checked in
    if (action === 'checkin') {
      const today = new Date().toISOString().split('T')[0]

      // Get current participant state
      const { data: participant } = await supabaseAdmin
        .from('challenge_participants')
        .select('current_day, total_checkins, checkin_streak, last_checkin, challenge_id')
        .eq('id', params.pid)
        .single()

      if (!participant) return NextResponse.json({ error: 'Participant not found' }, { status: 404 })

      // Compute streak
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      const newStreak = participant.last_checkin === yesterdayStr
        ? (participant.checkin_streak ?? 0) + 1
        : 1

      // Log the check-in
      await supabaseAdmin.from('challenge_checkins').upsert({
        participant_id: params.pid,
        challenge_id: participant.challenge_id,
        checkin_date: today,
        day_number: participant.current_day,
        mood: body.mood ?? null,
        weight_kg: body.weight_kg ?? null,
        note: body.note ?? null,
      }, { onConflict: 'participant_id,checkin_date' })

      updates = {
        last_checkin: today,
        total_checkins: (participant.total_checkins ?? 0) + 1,
        checkin_streak: newStreak,
        current_day: Math.min((participant.current_day ?? 1) + 1, 21),
      }

      // Auto-complete if day >= 21
      if ((updates.current_day as number) >= 21) {
        updates.status = 'completed'
        updates.completed_at = new Date().toISOString()
      }
    }

    const { data, error } = await supabaseAdmin
      .from('challenge_participants')
      .update(updates)
      .eq('id', params.pid)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; pid: string } }
) {
  const auth = await withAuth(req)
  if (!auth.authorized) return auth.response!

  try {
    const { error } = await supabaseAdmin
      .from('challenge_participants')
      .delete()
      .eq('id', params.pid)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
