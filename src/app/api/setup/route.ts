import { NextResponse , NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth-middleware'

// DISABLED for security — exec_sql is too dangerous to expose via API
// Use Supabase Dashboard or run-sql.mjs locally instead
export async function POST(request: NextRequest) {
  const auth = await withAuth(request)
  if (!auth.authorized) return auth.response!
  return NextResponse.json(
    { error: 'Setup endpoint disabled for security. Use Supabase Dashboard directly.' },
    { status: 403 }
  )
}

export async function GET(request: NextRequest) {
  const auth = await withAuth(request)
  if (!auth.authorized) return auth.response!
  return NextResponse.json(
    { error: 'Setup endpoint disabled for security.' },
    { status: 403 }
  )
}
