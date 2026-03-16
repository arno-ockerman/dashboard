import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// PATCH /api/notifications/[id]
// Body: { read: boolean }
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  let body: { read?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body.read !== 'boolean') {
    return NextResponse.json({ error: '"read" must be a boolean' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('notifications')
    .update({ read: body.read })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json(data)
}

// DELETE /api/notifications/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params

  const { error } = await supabaseAdmin
    .from('notifications')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
