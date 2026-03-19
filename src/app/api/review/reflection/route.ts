export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { reflectionSchema } from '@/lib/validators'
import { startOfISOWeek, format } from 'date-fns'

// ─── GET /api/review/reflection?week=YYYY-MM-DD ───────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await withAuth(request)
  if (!auth.authorized) return auth.response!
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
  const auth = await withAuth(request)
  if (!auth.authorized) return auth.response!
  try {
    const raw = await request.json()
    const parsed = reflectionSchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }
    const body = parsed.data

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
