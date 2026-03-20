export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { clientChecklistSchema } from '@/lib/validators'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await withAuth(request)
  if (!auth.authorized) return auth.response!
  try {
    const { data, error } = await supabaseAdmin
      .from('client_checklists')
      .select('*')
      .eq('client_id', params.id)
      .order('position', { ascending: true })

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await withAuth(request)
  if (!auth.authorized) return auth.response!
  try {
    const body = await request.json()
    const parsed = clientChecklistSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { data: currentItems } = await supabaseAdmin
      .from('client_checklists')
      .select('position')
      .eq('client_id', params.id)
      .order('position', { ascending: false })
      .limit(1)

    const nextPosition = currentItems && currentItems[0] ? currentItems[0].position + 1 : 0

    const { data, error } = await supabaseAdmin
      .from('client_checklists')
      .insert({
        ...parsed.data,
        client_id: params.id,
        position: parsed.data.position ?? nextPosition
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
