export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  const start = Date.now()
  try {
    const { error } = await supabaseAdmin.from('clients').select('id').limit(1)
    const latency = Date.now() - start
    if (error) {
      return NextResponse.json({ status: 'error', message: error.message, latency })
    }
    return NextResponse.json({ status: 'ok', latency, url: process.env.NEXT_PUBLIC_SUPABASE_URL })
  } catch (error) {
    return NextResponse.json({ status: 'error', message: String(error), latency: Date.now() - start })
  }
}
