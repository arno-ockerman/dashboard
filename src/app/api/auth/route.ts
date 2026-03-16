import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  const apiSecret = process.env.API_SECRET

  if (!apiSecret) {
    return NextResponse.json({ error: 'API_SECRET not configured' }, { status: 500 })
  }

  if (password !== apiSecret) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const response = NextResponse.json({ success: true })
  response.cookies.set('dashboard_session', apiSecret, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  })

  return response
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete('dashboard_session')
  return response
}
