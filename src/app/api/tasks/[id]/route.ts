import { NextResponse , NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await withAuth(req)
  if (!auth.authorized) return auth.response!
  try {
    const body = await req.json()
    const { id } = params

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ task: data })
  } catch (err) {
    console.error('Task PATCH error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabaseAdmin
      .from('tasks')
      .delete()
      .eq('id', params.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Task DELETE error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
