'use client'

import { useEffect, useState } from 'react'
import { Bot, Zap, Activity, Calendar, Heart, Terminal } from 'lucide-react'

interface AgentActivity {
  agent_id: string
  status: 'online' | 'busy' | 'idle' | 'offline'
  current_task: string | null
  last_ping: string
}

interface SystemActivity {
  id: string
  category: string
  summary: string
  level: 'info' | 'success' | 'warning' | 'error'
  timestamp: string
}

const AGENTS = [
  { id: 'jarvis', name: 'Jarvis', role: 'Orchestrator' },
  { id: 'mike', name: 'Mike', role: 'Web Dev' },
  { id: 'max', name: 'Max', role: 'Mobile Dev' },
  { id: 'kate', name: 'Kate', role: 'Marketing' },
  { id: 'lisa', name: 'Lisa', role: 'ASO' },
  { id: 'alex', name: 'Alex', role: 'Growth' },
  { id: 'steve', name: 'Steve', role: 'UI/UX' },
]

export default function MissionControl() {
  const [activities, setActivities] = useState<Record<string, AgentActivity>>({})
  const [feed, setFeed] = useState<SystemActivity[]>([])
  const [health, setHealth] = useState<{ score: number | null; steps: number | null }>({ score: null, steps: null })
  const [nextPost, setNextPost] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      // Fetch agent activity via API route
      try {
        const agentRes = await fetch('/api/agents')
        const agentData = await agentRes.json()
        if (Array.isArray(agentData)) {
          const activityMap = agentData.reduce((acc: Record<string, AgentActivity>, curr: AgentActivity) => ({ ...acc, [curr.agent_id]: curr }), {})
          setActivities(activityMap)
        }
      } catch (e) {}

      // Fetch system feed via API route
      try {
        const feedRes = await fetch('/api/feed')
        const feedData = await feedRes.json()
        if (Array.isArray(feedData)) setFeed(feedData)
      } catch (e) {}
      
      // Fetch health summary
      try {
        const hRes = await fetch('/api/health?limit=1')
        const hData = await hRes.json()
        if (hData.latest) {
          setHealth({ score: hData.latest.readiness_score, steps: hData.latest.steps })
        }
      } catch (e) {}

      // Fetch content summary
      try {
        const cRes = await fetch('/api/content?limit=1')
        const cData = await cRes.json()
        if (Array.isArray(cData) && cData.length > 0) {
          setNextPost(cData[0].title || cData[0].subject)
        }
      } catch (e) {}
    }

    fetchData()

    // Poll every 30s instead of realtime (anon key issue)
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="mt-auto p-4 space-y-4 border-t border-zinc-800 bg-zinc-900/50">
      {/* Health & Content Quick Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-zinc-950 p-2 rounded border border-zinc-800 flex items-center gap-2">
          <Heart className={`w-3 h-3 ${health.score && health.score >= 80 ? 'text-green-500' : 'text-brand-burgundy'}`} />
          <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-tighter">
            {health.score ? `${health.score}% RDY` : 'NO DATA'}
          </span>
        </div>
        <div className="bg-zinc-950 p-2 rounded border border-zinc-800 flex items-center gap-2 overflow-hidden">
          <Calendar className="w-3 h-3 text-brand-amber" />
          <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-tighter truncate">
            {nextPost || 'PLANNING...'}
          </span>
        </div>
      </div>

      {/* Live Feed */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1">
            <Terminal className="w-3 h-3" /> Live Feed
          </span>
          <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
        </div>
        <div className="space-y-1">
          {feed.length > 0 ? feed.map(item => (
            <div key={item.id} className="text-[9px] text-zinc-400 flex gap-1.5 items-start">
              <span className="text-zinc-600 font-mono">[{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}]</span>
              <span className="truncate">{item.summary}</span>
            </div>
          )) : (
            <div className="text-[9px] text-zinc-600 italic">No recent activity...</div>
          )}
        </div>
      </div>

      {/* Agents Grid */}
      <div className="space-y-2">
        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1">
          <Bot className="w-3 h-3" /> AI Team Status
        </span>
        <div className="grid grid-cols-4 gap-1.5">
          {AGENTS.map(agent => {
            const activity = activities[agent.id]
            const status = activity?.status || 'offline'
            const colorMap = {
              online: 'bg-green-500',
              busy: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
              idle: 'bg-green-500/50',
              offline: 'bg-zinc-700'
            }
            
            return (
              <div 
                key={agent.id} 
                className="group relative flex flex-col items-center gap-1"
                title={`${agent.name} (${agent.role}): ${activity?.current_task || status}`}
              >
                <div className={`w-2 h-2 rounded-full ${colorMap[status]} transition-all duration-500`} />
                <span className="text-[8px] text-zinc-600 group-hover:text-zinc-300 transition-colors uppercase font-bold">
                  {agent.id.slice(0, 3)}
                </span>
                
                {activity?.current_task && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 p-2 bg-zinc-950 border border-zinc-800 rounded shadow-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50">
                    <p className="text-[8px] text-brand-amber font-bold uppercase mb-1">{agent.name}</p>
                    <p className="text-[9px] text-zinc-300 leading-tight">{activity.current_task}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
