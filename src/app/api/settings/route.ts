export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const auth = await withAuth(request)
  if (!auth.authorized) return auth.response!
  try {
    const { data, error } = await supabaseAdmin
      .from('dashboard_settings')
      .select('*')

    if (error) {
      // Table might not exist yet - return defaults
      return NextResponse.json({
        settings: {
          team_models: {
            Jarvis: 'Claude Opus 4.6',
            Mike: 'GPT-5.3 Codex',
            Kate: 'Claude Opus 4.6',
            Steve: 'Gemini 3.1 Pro',
            Alex: 'Gemini 2.5 Pro',
          },
          notifications: {
            email: false,
            telegram: true,
            daily_digest: true,
          },
          revenue_target: 5000,
          brand_name: 'Make It Happen',
        },
      })
    }

    // Convert array of key-value pairs to object
    const settings: Record<string, unknown> = {}
    for (const row of data || []) {
      settings[row.key] = row.value
    }

    return NextResponse.json({ settings })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const auth = await withAuth(request)
  if (!auth.authorized) return auth.response!
  try {
    const body = await request.json()
    const { key, value } = body

    if (!key) {
      return NextResponse.json({ error: 'Missing key' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('dashboard_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
