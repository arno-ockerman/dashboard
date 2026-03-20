export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { clientChecklistUpdateSchema } from '@/lib/validators'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string, itemId: string } }
) {
  const auth = await withAuth(request)
  if (!auth.authorized) return auth.response!
  try {
    const body = await request.json()
    const parsed = clientChecklistUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('client_checklists')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', params.itemId)
      .eq('client_id', params.id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string, itemId: string } }
) {
  const auth = await withAuth(request)
  if (!auth.authorized) return auth.response!
  try {
    const { error } = await supabaseAdmin
      .from('client_checklists')
      .delete()
      .eq('id', params.itemId)
      .eq('client_id', params.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
