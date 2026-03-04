export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { subDays, format } from 'date-fns'

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function fetchAllData() {
  const today = new Date()
  const weekAgo = format(subDays(today, 7), 'yyyy-MM-dd')
  const monthAgo = format(subDays(today, 30), 'yyyy-MM-dd')

  const [
    clientsRes,
    tasksRes,
    projectsRes,
    teamActivityRes,
    contentPostsRes,
    contactSubmissionsRes,
    mealplannerLeadsRes,
  ] = await Promise.all([
    supabaseAdmin.from('clients').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('tasks').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('projects').select('*'),
    supabaseAdmin.from('team_activity').select('*').order('created_at', { ascending: false }).limit(100),
    supabaseAdmin.from('content_posts').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('contact_submissions').select('*').order('created_at', { ascending: false }).limit(50),
    supabaseAdmin.from('mealplanner_leads').select('*').order('created_at', { ascending: false }).limit(50),
  ])

  const clients = clientsRes.data ?? []
  const tasks = tasksRes.data ?? []
  const projects = projectsRes.data ?? []
  const teamActivity = teamActivityRes.data ?? []
  const contentPosts = contentPostsRes.data ?? []
  const contactSubmissions = contactSubmissionsRes.data ?? []
  const mealplannerLeads = mealplannerLeadsRes.data ?? []

  // Derived metrics
  const newClientsThisWeek = clients.filter(c => c.created_at >= weekAgo)
  const newClientsThisMonth = clients.filter(c => c.created_at >= monthAgo)
  const activeClients = clients.filter(c => c.status === 'active' || c.status === 'client')
  const inactiveClients = clients.filter(c => c.status === 'inactive')
  const leads = clients.filter(c => c.status === 'lead')
  const overdueClients = clients.filter(c => c.next_follow_up && c.next_follow_up < format(today, 'yyyy-MM-dd'))

  const completedTasks = tasks.filter(t => t.status === 'done' || t.status === 'completed')
  const pendingTasks = tasks.filter(t => t.status === 'todo' || t.status === 'pending' || t.status === 'backlog')
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress' || t.status === 'in-progress')
  const overdueTasks = tasks.filter(t => t.due_date && t.due_date < format(today, 'yyyy-MM-dd') && t.status !== 'done' && t.status !== 'completed')

  const publishedContent = contentPosts.filter(p => p.status === 'posted' || p.status === 'published')
  const scheduledContent = contentPosts.filter(p => p.status === 'scheduled')
  const draftContent = contentPosts.filter(p => p.status === 'draft')
  const ideaContent = contentPosts.filter(p => p.status === 'idea')

  const newContactsThisWeek = contactSubmissions.filter(c => c.created_at >= weekAgo)
  const newMealplannerLeadsThisWeek = mealplannerLeads.filter(l => l.created_at >= weekAgo)

  return {
    raw: { clients, tasks, projects, teamActivity, contentPosts, contactSubmissions, mealplannerLeads },
    metrics: {
      clients: {
        total: clients.length,
        newThisWeek: newClientsThisWeek.length,
        newThisMonth: newClientsThisMonth.length,
        active: activeClients.length,
        inactive: inactiveClients.length,
        leads: leads.length,
        overdueFollowUps: overdueClients.length,
        bySource: groupBy(clients, 'source'),
        overdueList: overdueClients.slice(0, 5).map(c => ({ name: c.name, due: c.next_follow_up, action: c.next_action })),
        inactiveList: inactiveClients.slice(0, 5).map(c => ({ name: c.name, updated: c.updated_at })),
      },
      tasks: {
        total: tasks.length,
        completed: completedTasks.length,
        pending: pendingTasks.length,
        inProgress: inProgressTasks.length,
        overdue: overdueTasks.length,
        completionRate: tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0,
        overdueList: overdueTasks.slice(0, 5).map(t => ({ title: t.title, due: t.due_date, assignee: t.assignee })),
      },
      content: {
        total: contentPosts.length,
        published: publishedContent.length,
        scheduled: scheduledContent.length,
        drafts: draftContent.length,
        ideas: ideaContent.length,
        byPlatform: groupBy(contentPosts, 'platform'),
        publishRate: contentPosts.length > 0 ? Math.round((publishedContent.length / contentPosts.length) * 100) : 0,
      },
      leads: {
        contactSubmissions: contactSubmissions.length,
        newContactsThisWeek: newContactsThisWeek.length,
        mealplannerLeads: mealplannerLeads.length,
        newMealplannerLeadsThisWeek: newMealplannerLeadsThisWeek.length,
      },
      team: {
        totalActivities: teamActivity.length,
        byAgent: groupBy(teamActivity, 'agent_name'),
      },
      projects: {
        total: projects.length,
        active: projects.filter((p: any) => p.status === 'active' || p.status === 'in_progress').length,
        completed: projects.filter((p: any) => p.status === 'completed' || p.status === 'done').length,
      },
    },
  }
}

function groupBy(arr: any[], key: string): Record<string, number> {
  return arr.reduce((acc, item) => {
    const val = item[key] ?? 'unknown'
    acc[val] = (acc[val] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)
}

// ─── Expert Engines (Mock/Template-Based Analysis) ────────────────────────────

function runGrowthStrategist(metrics: any) {
  const { clients, leads: leadMetrics } = metrics
  const findings: string[] = []
  const recommendations: string[] = []

  // New leads analysis
  if (clients.newThisWeek === 0) {
    findings.push('No new clients added this week — lead pipeline is stalled')
    recommendations.push('Launch a targeted Instagram story campaign to generate 3+ new leads this week')
  } else if (clients.newThisWeek >= 3) {
    findings.push(`Strong week: ${clients.newThisWeek} new clients added`)
    recommendations.push('Capitalize on momentum — reach out to all new leads within 24 hours')
  } else {
    findings.push(`${clients.newThisWeek} new client(s) added this week — moderate pace`)
  }

  // Lead-to-client conversion
  const totalLeads = clients.leads + clients.active
  const conversionRate = totalLeads > 0 ? Math.round((clients.active / totalLeads) * 100) : 0
  findings.push(`Current conversion rate: ${conversionRate}% (${clients.active} active / ${clients.leads} leads)`)
  if (conversionRate < 30) {
    recommendations.push('Conversion rate below 30% — create a structured follow-up sequence for all leads')
  }

  // Source analysis
  const sources = clients.bySource
  const topSource = Object.entries(sources).sort(([, a], [, b]) => (b as number) - (a as number))[0]
  if (topSource) {
    findings.push(`Top acquisition channel: ${topSource[0]} (${topSource[1]} clients)`)
    recommendations.push(`Double down on ${topSource[0]} — it's your best-performing channel`)
  }

  // Contact form + meal planner leads
  if (leadMetrics.newContactsThisWeek > 0) {
    findings.push(`${leadMetrics.newContactsThisWeek} new contact form submission(s) this week`)
  }
  if (leadMetrics.newMealplannerLeadsThisWeek > 0) {
    findings.push(`${leadMetrics.newMealplannerLeadsThisWeek} new meal planner lead(s) this week`)
    recommendations.push('Follow up on meal planner leads — these have high intent to buy')
  }

  // Overdue follow-ups
  if (clients.overdueFollowUps > 0) {
    findings.push(`⚠️ ${clients.overdueFollowUps} client(s) have overdue follow-ups`)
    recommendations.push(`Immediately contact ${clients.overdueFollowUps} client(s) with overdue follow-ups`)
  }

  return { findings, recommendations }
}

function runContentStrategist(metrics: any) {
  const { content } = metrics
  const findings: string[] = []
  const recommendations: string[] = []

  // Content pipeline health
  findings.push(`Content pipeline: ${content.published} published, ${content.scheduled} scheduled, ${content.drafts} drafts, ${content.ideas} ideas`)

  if (content.scheduled === 0) {
    findings.push('⚠️ No content scheduled — risk of posting gap')
    recommendations.push('Schedule at least 3 posts for the coming week to avoid content gap')
  } else if (content.scheduled < 3) {
    findings.push(`Only ${content.scheduled} post(s) scheduled — thin pipeline`)
    recommendations.push('Fill content calendar: aim for 5+ scheduled posts per week')
  } else {
    findings.push(`Good scheduled pipeline with ${content.scheduled} upcoming posts`)
  }

  // Drafts to push
  if (content.drafts > 3) {
    findings.push(`${content.drafts} drafts sitting unpublished`)
    recommendations.push(`Review and finalize ${content.drafts} draft posts — don't let good content sit idle`)
  }

  // Ideas to develop
  if (content.ideas >= 5) {
    findings.push(`${content.ideas} content ideas in backlog`)
    recommendations.push('Prioritize top ideas from backlog and move 2-3 to draft this week')
  }

  // Platform distribution
  const platforms = content.byPlatform
  const platformList = Object.entries(platforms).sort(([, a], [, b]) => (b as number) - (a as number))
  if (platformList.length > 0) {
    findings.push(`Most active platform: ${platformList[0][0]}`)
  }
  if (!platforms['instagram'] || platforms['instagram'] < 3) {
    recommendations.push('Increase Instagram output — aim for 4+ posts/week for algorithm growth')
  }

  // Publish rate
  if (content.publishRate < 50) {
    findings.push(`Content publish rate: ${content.publishRate}% — much content is not making it out`)
    recommendations.push('Review content workflow — identify bottlenecks causing low publish rate')
  }

  return { findings, recommendations }
}

function runOperationsAnalyst(metrics: any) {
  const { tasks, team, projects } = metrics
  const findings: string[] = []
  const recommendations: string[] = []

  // Task completion rate
  findings.push(`Task completion rate: ${tasks.completionRate}% (${tasks.completed}/${tasks.total} tasks)`)
  if (tasks.completionRate < 50) {
    findings.push('⚠️ Less than half of tasks are completed — system is backlogged')
    recommendations.push('Run a task triage session — archive stale tasks, prioritize the top 5 active ones')
  } else if (tasks.completionRate >= 80) {
    findings.push('Excellent task completion rate — team is executing well')
  }

  // Overdue tasks
  if (tasks.overdue > 0) {
    findings.push(`⚠️ ${tasks.overdue} overdue task(s) need immediate attention`)
    recommendations.push(`Resolve ${tasks.overdue} overdue task(s) — assign deadlines and owners`)
  }

  // In-progress WIP
  if (tasks.inProgress > 5) {
    findings.push(`High WIP: ${tasks.inProgress} tasks in progress simultaneously`)
    recommendations.push('Reduce work-in-progress — limit to 3 active tasks per team member to improve focus')
  }

  // Team activity
  const agentActivity = Object.entries(team.byAgent)
  if (agentActivity.length > 0) {
    const mostActive = agentActivity.sort(([, a], [, b]) => (b as number) - (a as number))[0]
    findings.push(`Most active agent: ${mostActive[0]} (${mostActive[1]} activities)`)
    const leastActive = agentActivity.sort(([, a], [, b]) => (a as number) - (b as number))[0]
    if (leastActive[0] !== mostActive[0] && (leastActive[1] as number) < 5) {
      findings.push(`Low activity from ${leastActive[0]} — may need direction`)
      recommendations.push(`Check in with ${leastActive[0]} — assign specific tasks to increase output`)
    }
  }

  // Projects
  findings.push(`${projects.active} active project(s) / ${projects.completed} completed`)
  if (projects.active > 5) {
    recommendations.push('Too many active projects — consider parking 1-2 to focus team energy')
  }

  return { findings, recommendations }
}

function runClientSuccessManager(metrics: any) {
  const { clients } = metrics
  const findings: string[] = []
  const recommendations: string[] = []

  // Inactive clients
  if (clients.inactive > 0) {
    findings.push(`${clients.inactive} inactive client(s) — potential re-engagement opportunity`)
    recommendations.push(`Send a re-engagement message to ${Math.min(clients.inactive, 3)} inactive clients this week`)
  } else {
    findings.push('No inactive clients — good retention!')
  }

  // Overdue follow-ups
  if (clients.overdueFollowUps > 0) {
    findings.push(`⚠️ ${clients.overdueFollowUps} client(s) with overdue follow-ups`)
    if (clients.overdueList.length > 0) {
      findings.push(`Priority contacts: ${clients.overdueList.map((c: any) => c.name).join(', ')}`)
    }
    recommendations.push(`Today's #1 priority: Call or message the ${clients.overdueFollowUps} clients with overdue follow-ups`)
  }

  // Overall client base health
  const healthScore = clients.total > 0 ? Math.round((clients.active / clients.total) * 100) : 0
  findings.push(`Client health score: ${healthScore}% active rate (${clients.active} active / ${clients.total} total)`)
  if (healthScore < 40) {
    findings.push('⚠️ Less than 40% of clients are active — churn risk is elevated')
    recommendations.push('Implement a monthly check-in routine for all clients to prevent further churn')
  } else if (healthScore >= 70) {
    findings.push('Strong active client ratio — focus on deepening relationships')
    recommendations.push('Send a value-add message to top 5 active clients — referrals come from happy clients')
  }

  // Growth potential
  if (clients.leads > 5) {
    findings.push(`${clients.leads} leads in pipeline — strong top-of-funnel`)
    recommendations.push(`Move ${Math.min(clients.leads, 3)} leads forward in pipeline this week with personalized outreach`)
  }

  return { findings, recommendations }
}

function runSynthesizer(
  growthReport: any,
  contentReport: any,
  opsReport: any,
  csReport: any,
  metrics: any
) {
  // Collect all recommendations across experts
  const allRecs = [
    ...growthReport.recommendations.map((r: string, i: number) => ({
      title: r,
      source: 'GrowthStrategist',
      domain: 'Growth',
      rawPriority: growthReport.recommendations.length - i,
    })),
    ...contentReport.recommendations.map((r: string, i: number) => ({
      title: r,
      source: 'ContentStrategist',
      domain: 'Content',
      rawPriority: contentReport.recommendations.length - i,
    })),
    ...opsReport.recommendations.map((r: string, i: number) => ({
      title: r,
      source: 'OperationsAnalyst',
      domain: 'Operations',
      rawPriority: opsReport.recommendations.length - i,
    })),
    ...csReport.recommendations.map((r: string, i: number) => ({
      title: r,
      source: 'ClientSuccessManager',
      domain: 'Client Success',
      rawPriority: csReport.recommendations.length - i,
    })),
  ]

  // Score and rank recommendations
  const scored = allRecs.map((rec) => {
    let impact: 'high' | 'medium' | 'low' = 'medium'
    let effort: 'high' | 'medium' | 'low' = 'medium'
    const lower = rec.title.toLowerCase()

    // Impact heuristics
    if (lower.includes('immediately') || lower.includes('#1 priority') || lower.includes('⚠️') || lower.includes('overdue') || lower.includes('churn')) {
      impact = 'high'
    } else if (lower.includes('increase') || lower.includes('double') || lower.includes('capitalize') || lower.includes('referral')) {
      impact = 'high'
    } else if (lower.includes('review') || lower.includes('check') || lower.includes('organize')) {
      impact = 'low'
    }

    // Effort heuristics
    if (lower.includes('launch') || lower.includes('implement') || lower.includes('structured') || lower.includes('sequence') || lower.includes('routine')) {
      effort = 'high'
    } else if (lower.includes('call') || lower.includes('message') || lower.includes('send') || lower.includes('contact') || lower.includes('follow up')) {
      effort = 'low'
    } else if (lower.includes('schedule') || lower.includes('review') || lower.includes('assign')) {
      effort = 'medium'
    }

    // Composite score: high impact + low effort = top priority
    const impactScore = impact === 'high' ? 3 : impact === 'medium' ? 2 : 1
    const effortPenalty = effort === 'high' ? 0 : effort === 'medium' ? 1 : 2
    const score = impactScore + effortPenalty + rec.rawPriority * 0.5

    return { ...rec, impact, effort, score }
  })

  // Sort by score descending, take top 5
  const top5 = scored.sort((a, b) => b.score - a.score).slice(0, 5)

  // Generate digest summary
  const keyNumbers = [
    metrics.clients.total > 0 ? `${metrics.clients.total} clients (${metrics.clients.active} active)` : null,
    metrics.clients.newThisWeek > 0 ? `${metrics.clients.newThisWeek} new leads this week` : null,
    metrics.tasks.completionRate > 0 ? `${metrics.tasks.completionRate}% task completion` : null,
    metrics.content.scheduled > 0 ? `${metrics.content.scheduled} posts scheduled` : null,
    metrics.clients.overdueFollowUps > 0 ? `${metrics.clients.overdueFollowUps} overdue follow-ups` : null,
  ].filter(Boolean).join(' · ')

  const urgentCount = top5.filter(r => r.impact === 'high').length
  const summary = `Business Intelligence Council analysis complete. ${keyNumbers}. ${urgentCount} high-impact action${urgentCount !== 1 ? 's' : ''} identified across Growth, Content, Operations, and Client Success. Top recommendation: ${top5[0]?.title ?? 'No specific recommendations at this time.'}`

  return { top5, summary }
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const today = format(new Date(), 'yyyy-MM-dd')

    // 1. Fetch all data
    const data = await fetchAllData()
    const { metrics } = data

    // 2. Run expert analyses
    const growthFindings = runGrowthStrategist(metrics)
    const contentFindings = runContentStrategist(metrics)
    const opsFindings = runOperationsAnalyst(metrics)
    const csFindings = runClientSuccessManager(metrics)
    const { top5, summary } = runSynthesizer(growthFindings, contentFindings, opsFindings, csFindings, metrics)

    // 3. Save expert reports to bi_reports
    const expertReports = [
      {
        report_date: today,
        expert_name: 'GrowthStrategist',
        domain: 'Growth',
        findings: growthFindings.findings,
        recommendations: growthFindings.recommendations,
        data_sources: ['clients', 'mealplanner_leads', 'contact_submissions'],
      },
      {
        report_date: today,
        expert_name: 'ContentStrategist',
        domain: 'Content',
        findings: contentFindings.findings,
        recommendations: contentFindings.recommendations,
        data_sources: ['content_posts'],
      },
      {
        report_date: today,
        expert_name: 'OperationsAnalyst',
        domain: 'Operations',
        findings: opsFindings.findings,
        recommendations: opsFindings.recommendations,
        data_sources: ['tasks', 'team_activity', 'projects'],
      },
      {
        report_date: today,
        expert_name: 'ClientSuccessManager',
        domain: 'Client Success',
        findings: csFindings.findings,
        recommendations: csFindings.recommendations,
        data_sources: ['clients'],
      },
      {
        report_date: today,
        expert_name: 'Synthesizer',
        domain: 'Strategy',
        findings: [summary],
        recommendations: top5.map((r: any) => r.title),
        data_sources: ['bi_reports'],
      },
    ]

    // Delete today's existing reports if re-running
    await supabaseAdmin.from('bi_reports').delete().eq('report_date', today)

    const { error: reportsError } = await supabaseAdmin.from('bi_reports').insert(expertReports)
    if (reportsError) throw reportsError

    // 4. Save digest (upsert by date)
    const { data: digest, error: digestError } = await supabaseAdmin
      .from('bi_digests')
      .upsert(
        {
          digest_date: today,
          summary,
          ranked_recommendations: top5,
          expert_count: 5,
          status: 'generated',
        },
        { onConflict: 'digest_date' }
      )
      .select()
      .single()

    if (digestError) throw digestError

    // 5. Save individual recommendations
    await supabaseAdmin.from('bi_recommendations').delete().eq('digest_id', digest.id)

    const recommendations = top5.map((rec: any, idx: number) => ({
      digest_id: digest.id,
      rank: idx + 1,
      title: rec.title,
      description: `Recommended by ${rec.source} | Domain: ${rec.domain}`,
      expert_source: rec.source,
      domain: rec.domain,
      impact: rec.impact,
      effort: rec.effort,
      status: 'proposed',
    }))

    const { error: recsError } = await supabaseAdmin.from('bi_recommendations').insert(recommendations)
    if (recsError) throw recsError

    return NextResponse.json({
      success: true,
      digest_id: digest.id,
      digest_date: today,
      summary,
      expert_count: 5,
      recommendations: top5.length,
      metrics: {
        clients: metrics.clients.total,
        active_clients: metrics.clients.active,
        new_this_week: metrics.clients.newThisWeek,
        task_completion: metrics.tasks.completionRate,
        content_scheduled: metrics.content.scheduled,
      },
    })
  } catch (error) {
    console.error('BI analyze error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
