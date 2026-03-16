export const dynamic = 'force-dynamic'

import { addMonths, format } from 'date-fns'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { formatSupabaseError, isMissingTableError } from '@/lib/supabase-error'
import type { ProductCategory, SalesCategoryBreakdown, SalesStats } from '@/types'

const CATEGORY_VALUES: ProductCategory[] = [
  'shakes',
  'supplements',
  'tea',
  'aloe',
  'skin',
  'challenge',
  'other',
]

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('sales')
      .select('amount, product_category, date')

    if (error) {
      if (isMissingTableError(error)) {
        const empty: SalesStats = {
          this_month: 0,
          last_month: 0,
          growth_pct: 0,
          total_sales: 0,
          avg_sale: 0,
          by_category: [],
        }
        return NextResponse.json(empty)
      }
      throw error
    }

    const rows = data || []
    const today = new Date()
    const thisMonthStartDate = monthStart(today)
    const nextMonthStartDate = addMonths(thisMonthStartDate, 1)
    const lastMonthStartDate = addMonths(thisMonthStartDate, -1)

    const thisMonthStart = format(thisMonthStartDate, 'yyyy-MM-dd')
    const nextMonthStart = format(nextMonthStartDate, 'yyyy-MM-dd')
    const lastMonthStart = format(lastMonthStartDate, 'yyyy-MM-dd')

    const categoryMap = new Map<ProductCategory, SalesCategoryBreakdown>()

    CATEGORY_VALUES.forEach((category) => {
      categoryMap.set(category, { category, total: 0, count: 0 })
    })

    let thisMonth = 0
    let lastMonth = 0
    let totalRevenue = 0

    for (const row of rows) {
      const amount = Number(row.amount) || 0
      const category = CATEGORY_VALUES.includes(row.product_category as ProductCategory)
        ? row.product_category as ProductCategory
        : 'other'

      totalRevenue += amount

      const categoryEntry = categoryMap.get(category)
      if (categoryEntry) {
        categoryEntry.total += amount
        categoryEntry.count += 1
      }

      if (row.date >= thisMonthStart && row.date < nextMonthStart) {
        thisMonth += amount
      } else if (row.date >= lastMonthStart && row.date < thisMonthStart) {
        lastMonth += amount
      }
    }

    let growthPct = 0
    if (lastMonth > 0) {
      growthPct = ((thisMonth - lastMonth) / lastMonth) * 100
    } else if (thisMonth > 0) {
      growthPct = 100
    }

    const stats: SalesStats = {
      this_month: thisMonth,
      last_month: lastMonth,
      growth_pct: growthPct,
      total_sales: rows.length,
      avg_sale: rows.length ? totalRevenue / rows.length : 0,
      by_category: CATEGORY_VALUES.map((category) => categoryMap.get(category)!).filter((entry) => entry.total > 0 || entry.count > 0),
    }

    return NextResponse.json(stats)
  } catch (error) {
    return NextResponse.json({ error: formatSupabaseError(error) }, { status: 500 })
  }
}
