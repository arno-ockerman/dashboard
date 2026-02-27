export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const weekStart = searchParams.get('week_start')
    const weekEnd = searchParams.get('week_end')
    const platform = searchParams.get('platform')
    const status = searchParams.get('status')
    const limit = searchParams.get('limit')

    let query = supabaseAdmin
      .from('content_posts')
      .select('*')
      .order('scheduled_date', { ascending: true, nullsFirst: false })

    if (weekStart) query = query.gte('scheduled_date', weekStart)
    if (weekEnd) query = query.lte('scheduled_date', weekEnd)
    if (platform && platform !== 'all') query = query.eq('platform', platform)
    if (status && status !== 'all') query = query.eq('status', status)
    if (limit) query = query.limit(parseInt(limit))

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json(data || [])
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { data, error } = await supabaseAdmin
      .from('content_posts')
      .insert({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...rest } = body
    const { data, error } = await supabaseAdmin
      .from('content_posts')
      .update({ ...rest, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const { error } = await supabaseAdmin.from('content_posts').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
