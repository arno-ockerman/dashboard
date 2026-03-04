import { PostgrestError } from '@supabase/supabase-js'

function safeJsonStringify(value: unknown) {
  try {
    return JSON.stringify(value)
  } catch {
    return null
  }
}

export function formatSupabaseError(error: unknown): string {
  if (!error) return 'Unknown error'

  if (error instanceof Error) {
    return error.message || 'Unknown error'
  }

  const maybePostgrest = error as Partial<PostgrestError> & { message?: unknown }
  if (typeof maybePostgrest.message === 'string' && maybePostgrest.message) {
    const code = typeof maybePostgrest.code === 'string' ? maybePostgrest.code : null
    const details = typeof maybePostgrest.details === 'string' ? maybePostgrest.details : null
    const hint = typeof maybePostgrest.hint === 'string' ? maybePostgrest.hint : null

    return [code, maybePostgrest.message, details, hint].filter(Boolean).join(' | ')
  }

  const json = safeJsonStringify(error)
  return json || String(error)
}

export function isMissingTableError(error: unknown): boolean {
  const anyError = error as { code?: unknown; message?: unknown; details?: unknown }
  const code = typeof anyError?.code === 'string' ? anyError.code : ''
  const message = typeof anyError?.message === 'string' ? anyError.message : ''
  const details = typeof anyError?.details === 'string' ? anyError.details : ''
  const combined = `${code} ${message} ${details}`.toLowerCase()

  return (
    code === '42P01' || // postgres relation does not exist
    code === 'PGRST205' || // postgrest: table not found / schema cache
    combined.includes('relation') && combined.includes('does not exist') ||
    combined.includes('could not find the table') ||
    combined.includes('schema cache')
  )
}

