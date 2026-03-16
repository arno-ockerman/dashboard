import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public paths that don't need auth
const PUBLIC_PATHS = ['/login', '/api/auth', '/_next', '/favicon.ico']

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname.startsWith(p))
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const apiSecret = process.env.API_SECRET
  if (!apiSecret) {
    // If API_SECRET not configured, allow all (dev mode)
    return NextResponse.next()
  }

  // Check auth: API key header OR session cookie
  const apiKey = request.headers.get('x-api-key')
  const sessionCookie = request.cookies.get('dashboard_session')?.value

  if (apiKey === apiSecret || sessionCookie === apiSecret) {
    return NextResponse.next()
  }

  // API routes return 401
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Pages redirect to login
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('next', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    // Match all paths except static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
