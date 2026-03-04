export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { readdir, readFile } from 'fs/promises'
import path from 'path'
import { format, subDays, subMonths } from 'date-fns'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { isMissingTableError } from '@/lib/supabase-error'

type Period = 'today' | 'week' | 'month' | 'all'
type Provider = 'anthropic' | 'openai' | 'google'

interface UsageRecord {
  date: string
  model: string
  provider: Provider
  calls: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCostUsd: number
}

interface AggregateBucket {
  date?: string
  model?: string
  provider?: Provider
  calls: number
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCostUsd: number
}

interface SupabaseUsageRow {
  date: string
  model: string
  provider: string | null
  calls: number | null
  input_tokens: number | null
  output_tokens: number | null
  total_tokens: number | null
  estimated_cost_usd: number | string | null
}

const LOG_DIR = process.env.OPENCLAW_USAGE_LOG_DIR ?? '/home/node/.openclaw/cron/runs'

const PERIOD_LABELS: Record<Period, string> = {
  today: 'today',
  week: 'last 7 days',
  month: 'last 30 days',
  all: 'all time',
}

function normalizePeriod(value: string | null): Period {
  if (value === 'today' || value === 'week' || value === 'month' || value === 'all') {
    return value
  }

  return 'all'
}

function normalizeProvider(value: string | null | undefined, model: string): Provider {
  const lowerValue = (value ?? '').toLowerCase()

  if (lowerValue === 'anthropic' || lowerValue === 'openai' || lowerValue === 'google') {
    return lowerValue
  }

  const lowerModel = model.toLowerCase()

  if (lowerModel.startsWith('claude')) {
    return 'anthropic'
  }
  if (lowerModel.startsWith('gpt')) {
    return 'openai'
  }

  return 'google'
}

function getPricing(model: string) {
  const lowerModel = model.toLowerCase()

  if (lowerModel === 'claude-opus-4-6') {
    return { inputPerMillion: 15, outputPerMillion: 75 }
  }
  if (lowerModel === 'claude-sonnet-4-6' || lowerModel === 'claude-sonnet-4-5') {
    return { inputPerMillion: 3, outputPerMillion: 15 }
  }
  if (lowerModel === 'gpt-5.3-codex' || lowerModel === 'gpt-5.2-codex') {
    return { inputPerMillion: 2, outputPerMillion: 8 }
  }
  if (lowerModel.startsWith('gemini-')) {
    return { inputPerMillion: 0, outputPerMillion: 0 }
  }

  return { inputPerMillion: 0, outputPerMillion: 0 }
}

function parseNumericValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return 0
}

function getPeriodStart(period: Period) {
  const now = new Date()

  if (period === 'today') {
    return format(now, 'yyyy-MM-dd')
  }
  if (period === 'week') {
    return format(subDays(now, 6), 'yyyy-MM-dd')
  }
  if (period === 'month') {
    return format(subMonths(now, 1), 'yyyy-MM-dd')
  }

  return null
}

function shouldIncludeDate(date: string, period: Period) {
  const start = getPeriodStart(period)

  if (!start) {
    return true
  }

  return date >= start
}

function estimateCostUsd(model: string, inputTokens: number, outputTokens: number, totalTokens: number) {
  const pricing = getPricing(model)
  const fallbackInputTokens = inputTokens === 0 && outputTokens === 0 ? totalTokens : inputTokens

  return (
    (fallbackInputTokens / 1_000_000) * pricing.inputPerMillion +
    (outputTokens / 1_000_000) * pricing.outputPerMillion
  )
}

function addRecord(record: UsageRecord, byModel: Map<string, AggregateBucket>, byDay: Map<string, AggregateBucket>) {
  const modelBucket = byModel.get(record.model) ?? {
    model: record.model,
    provider: record.provider,
    calls: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    estimatedCostUsd: 0,
  }

  modelBucket.calls += record.calls
  modelBucket.inputTokens += record.inputTokens
  modelBucket.outputTokens += record.outputTokens
  modelBucket.totalTokens += record.totalTokens
  modelBucket.estimatedCostUsd += record.estimatedCostUsd
  byModel.set(record.model, modelBucket)

  const dayBucket = byDay.get(record.date) ?? {
    date: record.date,
    calls: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    estimatedCostUsd: 0,
  }

  dayBucket.calls += record.calls
  dayBucket.inputTokens += record.inputTokens
  dayBucket.outputTokens += record.outputTokens
  dayBucket.totalTokens += record.totalTokens
  dayBucket.estimatedCostUsd += record.estimatedCostUsd
  byDay.set(record.date, dayBucket)
}

async function readJsonlUsage(period: Period) {
  try {
    const files = (await readdir(LOG_DIR))
      .filter((file) => file.endsWith('.jsonl'))
      .sort()

    const records: UsageRecord[] = []

    for (const file of files) {
      const fullPath = path.join(LOG_DIR, file)
      const content = await readFile(fullPath, 'utf8')
      const lines = content.split('\n')

      for (const line of lines) {
        if (!line.trim()) {
          continue
        }

        try {
          const parsed = JSON.parse(line) as {
            ts?: unknown
            runAtMs?: unknown
            timestamp?: unknown
            model?: unknown
            provider?: unknown
            usage?: {
              input_tokens?: unknown
              output_tokens?: unknown
              total_tokens?: unknown
            }
          }

          if (typeof parsed.model !== 'string' || !parsed.usage) {
            continue
          }

          const timestamp =
            parseNumericValue(parsed.ts) ||
            parseNumericValue(parsed.runAtMs) ||
            parseNumericValue(parsed.timestamp)

          if (!timestamp) {
            continue
          }

          const date = format(new Date(timestamp), 'yyyy-MM-dd')

          if (!shouldIncludeDate(date, period)) {
            continue
          }

          const inputTokens = parseNumericValue(parsed.usage.input_tokens)
          const outputTokens = parseNumericValue(parsed.usage.output_tokens)
          const totalTokens = parseNumericValue(parsed.usage.total_tokens) || inputTokens + outputTokens
          const provider = normalizeProvider(
            typeof parsed.provider === 'string' ? parsed.provider : null,
            parsed.model
          )

          records.push({
            date,
            model: parsed.model,
            provider,
            calls: 1,
            inputTokens,
            outputTokens,
            totalTokens,
            estimatedCostUsd: estimateCostUsd(parsed.model, inputTokens, outputTokens, totalTokens),
          })
        } catch {
          continue
        }
      }
    }

    return records
  } catch {
    return [] as UsageRecord[]
  }
}

async function readSupabaseUsage(period: Period) {
  try {
    let query = supabaseAdmin
      .from('llm_usage')
      .select('date, model, provider, calls, input_tokens, output_tokens, total_tokens, estimated_cost_usd')

    const start = getPeriodStart(period)

    if (start) {
      query = query.gte('date', start)
    }

    const { data, error } = await query

    if (error) {
      if (isMissingTableError(error)) {
        return [] as UsageRecord[]
      }

      return [] as UsageRecord[]
    }

    return ((data ?? []) as SupabaseUsageRow[]).map((row) => {
      const inputTokens = parseNumericValue(row.input_tokens)
      const outputTokens = parseNumericValue(row.output_tokens)
      const totalTokens = parseNumericValue(row.total_tokens) || inputTokens + outputTokens

      return {
        date: row.date,
        model: row.model,
        provider: normalizeProvider(row.provider, row.model),
        calls: parseNumericValue(row.calls) || 0,
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedCostUsd:
          parseNumericValue(row.estimated_cost_usd) ||
          estimateCostUsd(row.model, inputTokens, outputTokens, totalTokens),
      }
    })
  } catch {
    return [] as UsageRecord[]
  }
}

export async function GET(request: NextRequest) {
  try {
    const period = normalizePeriod(request.nextUrl.searchParams.get('period'))
    const [jsonlRecords, supabaseRecords] = await Promise.all([
      readJsonlUsage(period),
      readSupabaseUsage(period),
    ])

    const byModel = new Map<string, AggregateBucket>()
    const byDay = new Map<string, AggregateBucket>()

    for (const record of [...jsonlRecords, ...supabaseRecords]) {
      addRecord(record, byModel, byDay)
    }

    const byModelRows = Array.from(byModel.values())
      .map((entry) => ({
        model: entry.model ?? 'unknown',
        provider: entry.provider ?? 'google',
        calls: entry.calls,
        inputTokens: entry.inputTokens,
        outputTokens: entry.outputTokens,
        totalTokens: entry.totalTokens,
        estimatedCostUsd: Number(entry.estimatedCostUsd.toFixed(6)),
      }))
      .sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd)

    const byDayRows = Array.from(byDay.values())
      .map((entry) => ({
        date: entry.date ?? '',
        totalTokens: entry.totalTokens,
        totalCostUsd: Number(entry.estimatedCostUsd.toFixed(6)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const summary = byModelRows.reduce(
      (accumulator, row) => ({
        totalCalls: accumulator.totalCalls + row.calls,
        totalTokens: accumulator.totalTokens + row.totalTokens,
        totalCostUsd: accumulator.totalCostUsd + row.estimatedCostUsd,
      }),
      {
        totalCalls: 0,
        totalTokens: 0,
        totalCostUsd: 0,
      }
    )

    return NextResponse.json({
      summary: {
        ...summary,
        totalCostUsd: Number(summary.totalCostUsd.toFixed(6)),
        period: PERIOD_LABELS[period],
      },
      byModel: byModelRows,
      byDay: byDayRows,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load usage data'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
