export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabaseAdmin
      .from('clients')
      .select('*')
      .lte('next_follow_up', today)
      .neq('status', 'inactive')
      .order('next_follow_up', { ascending: true })

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
