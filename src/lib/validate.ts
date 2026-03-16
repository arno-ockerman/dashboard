import { NextResponse } from 'next/server'

/**
 * Safe integer parser with bounds
 */
export function safeInt(value: string | null, defaultVal: number, min = 1, max = 200): number {
  if (!value) return defaultVal
  const parsed = parseInt(value, 10)
  if (isNaN(parsed)) return defaultVal
  return Math.min(Math.max(parsed, min), max)
}

/**
 * Validate UUID format
 */
export function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}

/**
 * Safe JSON body parser — returns null on invalid input
 */
export async function safeJsonBody<T>(req: Request): Promise<T | null> {
  try {
    return await req.json() as T
  } catch {
    return null
  }
}

/**
 * Error response helper — never leaks internals
 */
export function errorResponse(status: number, message: string = 'Internal server error') {
  return NextResponse.json({ error: message }, { status })
}
