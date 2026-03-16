export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { startOfISOWeek, format } from 'date-fns'

// ─── GET /api/review/reflection?week=YYYY-MM-DD ───────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const weekParam = searchParams.get('week')
    const anchor = weekParam ? new Date(weekParam) : new Date()
    const weekStart = format(startOfISOWeek(anchor), 'yyyy-MM-dd')

    const { data, error } = await supabaseAdmin
      .from('weekly_reflections')
      .select('*')
      .eq('week_start', weekStart)
      .maybeSingle()

    if (error) throw error
    return NextResponse.json(data ?? null)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ─── POST /api/review/reflection ─────────────────────────────────────────────
// Body: { week_start, wins?, lessons?, next_focus?, score? }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      week_start: string
      wins?: string
      lessons?: string
      next_focus?: string
      score?: number
    }

    if (!body.week_start) {
      return NextResponse.json({ error: 'week_start required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('weekly_reflections')
      .upsert(
        {
          week_start:  body.week_start,
          wins:        body.wins ?? null,
          lessons:     body.lessons ?? null,
          next_focus:  body.next_focus ?? null,
          score:       body.score ?? null,
          updated_at:  new Date().toISOString(),
        },
        { onConflict: 'week_start' }
      )
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
