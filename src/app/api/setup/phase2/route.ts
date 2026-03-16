import { NextResponse } from 'next/server'

// DISABLED for security — exec_sql is too dangerous to expose via API
export async function POST() {
  return NextResponse.json(
    { error: 'Setup endpoint disabled for security. Use Supabase Dashboard directly.' },
    { status: 403 }
  )
}
