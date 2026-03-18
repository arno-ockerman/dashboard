export const dynamic = 'force-dynamic'
import { NextResponse , NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const auth = await withAuth(request)
  if (!auth.authorized) return auth.response!
  const start = Date.now()
  try {
    const { error } = await supabaseAdmin.from('clients').select('id').limit(1)
    const latency = Date.now() - start
    if (error) {
      return NextResponse.json({ status: 'error', message: 'Connection failed', latency })
    }
    return NextResponse.json({ status: 'ok', latency, url: process.env.NEXT_PUBLIC_SUPABASE_URL })
  } catch (error) {
    return NextResponse.json({ status: 'error', message: String(error), latency: Date.now() - start })
  }
}
