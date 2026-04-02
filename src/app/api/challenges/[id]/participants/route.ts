export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { challengeParticipantSchema } from '@/lib/validators'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await withAuth(req)
  if (!auth.authorized) return auth.response!

  try {
    const { data, error } = await supabaseAdmin
      .from('challenge_participants')
      .select('*, client:clients(id,name,email,phone,telegram,status)')
      .eq('challenge_id', params.id)
      .order('enrolled_at', { ascending: true })
    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await withAuth(req)
  if (!auth.authorized) return auth.response!

  try {
    const json = await req.json()
    const parsed = challengeParticipantSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { client_id, name, telegram, enrolled_at } = parsed.data

    // Compute current_day from challenge start
    const { data: challenge } = await supabaseAdmin
      .from('challenges')
      .select('start_date')
      .eq('id', params.id)
      .single()

    const startDate = challenge?.start_date ? new Date(challenge.start_date) : new Date()
    const enrollDate = enrolled_at ? new Date(enrolled_at) : new Date()
    const current_day = Math.max(1, Math.floor((enrollDate.getTime() - startDate.getTime()) / 86400000) + 1)

    const { data, error } = await supabaseAdmin
      .from('challenge_participants')
      .insert({
        challenge_id: params.id,
        client_id: client_id || null,
        name,
        telegram: telegram || null,
        enrolled_at: enrollDate.toISOString().split('T')[0],
        current_day,
      })
      .select('*, client:clients(id,name,email,phone,telegram,status)')
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
