export type ClientStatus = 'lead' | 'prospect' | 'client' | 'team_member' | 'inactive'
export type ClientSource = 'instagram' | 'telegram' | 'referral' | 'website' | 'challenge' | 'other'
export type InteractionType = 'call' | 'message' | 'meeting' | 'email' | 'social' | 'other'
export type ProductCategory = 'shakes' | 'supplements' | 'tea' | 'aloe' | 'skin' | 'challenge' | 'other'
export type GoalCategory = 'business' | 'fitness' | 'personal'
export type ContentPlatform = 'instagram' | 'telegram' | 'stories' | 'reels' | 'tiktok' | 'other'
export type ContentStatus = 'idea' | 'draft' | 'scheduled' | 'posted'
export type KnowledgeType = 'video' | 'article' | 'social' | 'document' | 'note' | 'other'
export type KnowledgeCategory = 'fitness' | 'business' | 'nutrition' | 'tech' | 'inspiration' | 'herbalife' | 'other'

export interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  telegram?: string
  status: ClientStatus
  tags: string[]
  source: ClientSource
  notes?: string
  next_follow_up?: string
  next_action?: string
  created_at: string
  updated_at: string
}

export interface Interaction {
  id: string
  client_id: string
  type: InteractionType
  notes?: string
  created_at: string
}

export interface Sale {
  id: string
  client_id?: string
  client_name?: string
  product_category: ProductCategory
  product_name?: string
  amount: number
  date: string
  notes?: string
  created_at: string
}

export interface SalesCategoryBreakdown {
  category: ProductCategory
  total: number
  count: number
}

export interface SalesStats {
  this_month: number
  last_month: number
  growth_pct: number
  total_sales: number
  avg_sale: number
  by_category: SalesCategoryBreakdown[]
}

export interface Goal {
  id: string
  title: string
  category: GoalCategory
  target_value?: number
  current_value: number
  unit?: string
  deadline?: string
  completed: boolean
  created_at: string
  updated_at: string
}

export interface Habit {
  id: string
  title: string
  icon: string
  streak: number
  active: boolean
  created_at: string
  completed_today?: boolean
}

export interface HabitLog {
  id: string
  habit_id: string
  date: string
  completed: boolean
}

export interface Knowledge {
  id: string
  title: string
  url?: string
  description?: string
  thumbnail?: string
  type: KnowledgeType
  category: KnowledgeCategory
  tags: string[]
  created_at: string
}

export interface Content {
  id: string
  title: string
  description?: string
  platform?: ContentPlatform
  status: ContentStatus
  scheduled_date?: string
  content_type?: string
  media_url?: string
  caption?: string
  created_at: string
  updated_at: string
}

export interface DashboardStats {
  revenue_this_month: number
  revenue_target: number
  active_clients: number
  follow_ups_today: number
  sales_this_month: number
  new_leads_this_week: number
}

// ─── Team & Agent Types ───────────────────────────────────────────────────────

export type AgentStatus = 'active' | 'idle' | 'busy' | 'offline'
export type ActionType = 'commit' | 'pr' | 'deploy' | 'task_complete' | 'message'
export type TaskPriority = 'high' | 'medium' | 'low'
export type TaskStatus = 'todo' | 'in_progress' | 'done'
export type ProjectStatus = 'active' | 'paused' | 'completed' | 'planning'

export interface Agent {
  name: string
  emoji: string
  role: string
  model: string
  status: AgentStatus
  currentTask?: string
  color: string
}

export interface TeamActivity {
  id: string
  agent_name: string
  action_type: ActionType
  description?: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface Task {
  id: string
  title: string
  description?: string
  assigned_to?: string
  priority: TaskPriority
  status: TaskStatus
  project?: string
  created_by: string
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  description?: string
  status: ProjectStatus
  github_repo?: string
  vercel_url?: string
  last_update: string
  metadata: Record<string, unknown>
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  source: string
  read: boolean
  metadata: Record<string, unknown>
  created_at: string
}
