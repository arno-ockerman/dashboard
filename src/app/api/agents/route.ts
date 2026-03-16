import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('agent_activity')
    .select('*')

  if (error) return NextResponse.json([], { status: 200 })
  return NextResponse.json(data ?? [])
}
