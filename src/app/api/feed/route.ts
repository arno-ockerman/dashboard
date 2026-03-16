import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('system_activity')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(3)

  if (error) return NextResponse.json([], { status: 200 })
  return NextResponse.json(data ?? [])
}
