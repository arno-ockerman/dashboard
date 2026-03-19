export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
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
  try {
    const body = await req.json()
    const { client_id, name, telegram, enrolled_at } = body

    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

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
