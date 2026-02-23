import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]

    // This month sales
    const { data: thisMonth } = await supabaseAdmin
      .from('sales')
      .select('amount, product_category')
      .gte('date', thisMonthStart)

    // Last month sales
    const { data: lastMonth } = await supabaseAdmin
      .from('sales')
      .select('amount')
      .gte('date', lastMonthStart)
      .lte('date', lastMonthEnd)

    // Monthly breakdown (last 12 months)
    const monthlyData = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const start = d.toISOString().split('T')[0]
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
      
      const { data: monthSales } = await supabaseAdmin
        .from('sales')
        .select('amount')
        .gte('date', start)
        .lte('date', end)

      monthlyData.push({
        month: d.toLocaleString('default', { month: 'short' }),
        year: d.getFullYear(),
        revenue: monthSales?.reduce((sum, s) => sum + Number(s.amount), 0) || 0,
        count: monthSales?.length || 0,
      })
    }

    // Product breakdown this month
    const productBreakdown: Record<string, number> = {}
    thisMonth?.forEach((s) => {
      const cat = s.product_category || 'other'
      productBreakdown[cat] = (productBreakdown[cat] || 0) + Number(s.amount)
    })

    const thisMonthRevenue = thisMonth?.reduce((sum, s) => sum + Number(s.amount), 0) || 0
    const lastMonthRevenue = lastMonth?.reduce((sum, s) => sum + Number(s.amount), 0) || 0
    const growth = lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : 0

    return NextResponse.json({
      this_month_revenue: thisMonthRevenue,
      this_month_count: thisMonth?.length || 0,
      last_month_revenue: lastMonthRevenue,
      growth_percent: Math.round(growth * 10) / 10,
      average_sale: thisMonth && thisMonth.length > 0 ? thisMonthRevenue / thisMonth.length : 0,
      monthly_data: monthlyData,
      product_breakdown: Object.entries(productBreakdown).map(([name, value]) => ({ name, value })),
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
