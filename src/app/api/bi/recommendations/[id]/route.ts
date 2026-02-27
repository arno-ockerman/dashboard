export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    const allowedFields = ['status', 'feedback']
    const update: Record<string, any> = { updated_at: new Date().toISOString() }

    for (const field of allowedFields) {
      if (field in body) {
        update[field] = body[field]
      }
    }

    // Validate status
    if (update.status) {
      const validStatuses = ['proposed', 'accepted', 'rejected', 'completed']
      if (!validStatuses.includes(update.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
    }

    const { data, error } = await supabaseAdmin
      .from('bi_recommendations')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data, error } = await supabaseAdmin
      .from('bi_recommendations')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
