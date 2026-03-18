import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function withAuth(
  request: NextRequest
): Promise<{ authorized: boolean; response?: NextResponse }> {
  const apiSecret = process.env.API_SECRET

  // If API_SECRET is not configured, deny all access
  if (!apiSecret) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Server misconfiguration: API_SECRET not set' },
        { status: 500 }
      ),
    }
  }

  // Check Authorization header (Bearer token)
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    if (token === apiSecret) {
      return { authorized: true }
    }
  }

  // Check cookie-based session
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('dashboard_session')
  if (sessionCookie?.value === apiSecret) {
    return { authorized: true }
  }

  return {
    authorized: false,
    response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
  }
}
