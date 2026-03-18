export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
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
  try {
    const body = await req.json()
    const { name, description, type = '21day', start_date, color = '#10b981' } = body

    if (!name || !start_date) {
      return NextResponse.json({ error: 'name and start_date are required' }, { status: 400 })
    }

    // Calculate end date based on type
    const days = type === '28day' ? 28 : type === 'custom' ? (body.target_count ?? 21) : 21
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
