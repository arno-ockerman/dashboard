export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { challengeUpdateSchema } from '@/lib/validators'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await withAuth(req)
  if (!auth.authorized) return auth.response!

  try {
    const { data, error } = await supabaseAdmin
      .from('challenge_overview')
      .select('*')
      .eq('id', params.id)
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await withAuth(req)
  if (!auth.authorized) return auth.response!

  try {
    const json = await req.json()
    const parsed = challengeUpdateSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('challenges')
      .update(parsed.data)
      .eq('id', params.id)
      .select()
      .single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await withAuth(req)
  if (!auth.authorized) return auth.response!

  try {
    const { error } = await supabaseAdmin
      .from('challenges')
      .delete()
      .eq('id', params.id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
