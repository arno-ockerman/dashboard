export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const auth = await withAuth(request)
  if (!auth.authorized) return auth.response!
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    let query = supabaseAdmin
      .from('clients')
      .select('*')
      .order('updated_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await withAuth(request)
  if (!auth.authorized) return auth.response!
  try {
    const body = await request.json()
    const { data, error } = await supabaseAdmin
      .from('clients')
      .insert(body)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
