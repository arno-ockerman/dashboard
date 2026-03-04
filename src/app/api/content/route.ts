export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { formatSupabaseError, isMissingTableError } from '@/lib/supabase-error'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const weekStart = searchParams.get('week_start')
    const weekEnd = searchParams.get('week_end')

    let query = supabaseAdmin
      .from('content')
      .select('*')
      .order('scheduled_date', { ascending: true })

    if (weekStart) query = query.gte('scheduled_date', weekStart)
    if (weekEnd) query = query.lte('scheduled_date', weekEnd)

    const { data, error } = await query
    if (error) {
      if (isMissingTableError(error)) return NextResponse.json([])
      throw error
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: formatSupabaseError(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { data, error } = await supabaseAdmin
      .from('content')
      .insert(body)
      .select()
      .single()

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          { error: 'Content table missing. Run dashboard schema setup/migrations.' },
          { status: 503 }
        )
      }
      throw error
    }
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: formatSupabaseError(error) }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...rest } = body
    const { data, error } = await supabaseAdmin
      .from('content')
      .update({ ...rest, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (isMissingTableError(error)) {
        return NextResponse.json(
          { error: 'Content table missing. Run dashboard schema setup/migrations.' },
          { status: 503 }
        )
      }
      throw error
    }
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: formatSupabaseError(error) }, { status: 500 })
  }
}
