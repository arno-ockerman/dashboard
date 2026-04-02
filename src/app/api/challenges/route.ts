export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { challengeSchema } from '@/lib/validators'

export async function GET(req: NextRequest) {
  const auth = await withAuth(req)
  if (!auth.authorized) return auth.response!

  try {
    const { data, error } = await supabaseAdmin
      .from('challenge_overview')
      .select('*')
      .order('start_date', { ascending: false })
    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await withAuth(req)
  if (!auth.authorized) return auth.response!

  try {
    const json = await req.json()
    const parsed = challengeSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { name, description, type = '21day', start_date, color = '#10b981', target_count } = parsed.data

    // Calculate end date based on type
    const days = type === '28day' ? 28 : type === 'custom' ? (target_count ?? 21) : 21
    const startD = new Date(start_date)
    const endD = new Date(startD)
    endD.setDate(endD.getDate() + days - 1)
    const end_date = endD.toISOString().split('T')[0]

    const { data, error } = await supabaseAdmin
      .from('challenges')
      .insert({ name, description, type, start_date, end_date, color, target_count: days })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
