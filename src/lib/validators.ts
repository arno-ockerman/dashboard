import { z } from 'zod'

// ─── Helpers ────────────────────────────────────────────────────────────────

const trimmedStr = (max = 500) =>
  z.string().trim().min(1).max(max)

const optionalStr = (max = 500) =>
  z.string().trim().max(max).optional()

// ─── Clients ────────────────────────────────────────────────────────────────

export const clientSchema = z.object({
  name: trimmedStr(200),
  email: z.string().trim().email().max(200).optional().or(z.literal('')),
  phone: z.string().trim().max(50).optional(),
  status: z.enum(['lead', 'active', 'inactive', 'prospect']).optional(),
  notes: z.string().trim().max(5000).optional(),
}).passthrough()

export const clientUpdateSchema = clientSchema.partial()

// ─── Habits ─────────────────────────────────────────────────────────────────

export const habitSchema = z.object({
  title: trimmedStr(200),
  icon: z.string().trim().max(10).optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  color: z.string().trim().max(20).optional(),
  description: optionalStr(),
}).passthrough()

export const habitUpdateSchema = habitSchema.partial()

// ─── Tasks ──────────────────────────────────────────────────────────────────

export const taskSchema = z.object({
  title: trimmedStr(300),
  description: optionalStr(2000),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['todo', 'in_progress', 'done', 'cancelled']).optional(),
  due_date: z.string().trim().datetime({ offset: true }).optional().or(z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  assigned_to: optionalStr(100),
  project: optionalStr(200),
  created_by: optionalStr(100),
}).passthrough()

export const taskUpdateSchema = taskSchema.partial()

// ─── Goals ──────────────────────────────────────────────────────────────────

export const goalSchema = z.object({
  title: trimmedStr(300),
  description: optionalStr(2000),
  target: z.number().optional(),
  progress: z.number().min(0).optional(),
  deadline: z.string().trim().optional(),
  status: z.enum(['active', 'completed', 'paused', 'cancelled']).optional(),
  category: optionalStr(100),
}).passthrough()

export const goalUpdateSchema = goalSchema.partial()

// ─── Review / Reflection ────────────────────────────────────────────────────

export const reflectionSchema = z.object({
  week_start: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'week_start must be YYYY-MM-DD'),
  wins: optionalStr(5000),
  lessons: optionalStr(5000),
  next_focus: optionalStr(5000),
  score: z.number().min(0).max(10).optional(),
}).passthrough()

// ─── Knowledge ──────────────────────────────────────────────────────────────

export const knowledgeSchema = z.object({
  title: trimmedStr(300),
  content: z.string().trim().max(50000).optional(),
  category: optionalStr(100),
  tags: z.array(z.string().trim().max(50)).max(20).optional(),
}).passthrough()

export const knowledgeUpdateSchema = knowledgeSchema.partial()

// ─── Content Posts ───────────────────────────────────────────────────────────

export const contentPostSchema = z.object({
  title: trimmedStr(300),
  body: optionalStr(10000),
  caption: optionalStr(5000),
  platform: z.enum(['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok', 'youtube', 'other']).optional(),
  status: z.enum(['draft', 'scheduled', 'published', 'cancelled']).optional(),
  scheduled_at: z.string().trim().optional(),
  tags: z.array(z.string().trim().max(50)).max(20).optional(),
}).passthrough()

export const contentPostUpdateSchema = contentPostSchema.partial()

// ─── Settings ───────────────────────────────────────────────────────────────

export const settingSchema = z.object({
  key: z.string().trim().min(1).max(200),
  value: z.unknown(),
})

// ─── Team Activity ───────────────────────────────────────────────────────────

export const teamActivitySchema = z.object({
  agent_name: z.string().trim().min(1).max(100),
  action_type: z.string().trim().min(1).max(100),
  description: optionalStr(1000),
  metadata: z.record(z.unknown()).optional(),
})

// ─── Client Interactions ────────────────────────────────────────────────────

export const clientInteractionSchema = z.object({
  type: z.string().trim().min(1).max(100),
  notes: optionalStr(5000),
  date: z.string().trim().optional(),
}).passthrough()

// ─── Sales ──────────────────────────────────────────────────────────────────

export const saleSchema = z.object({
  client_id: z.string().uuid().optional(),
  amount: z.number().min(0),
  description: optionalStr(500),
  date: z.string().trim().optional(),
  category: optionalStr(100),
}).passthrough()

// ─── Notifications ───────────────────────────────────────────────────────────

export const notificationSchema = z.object({
  title: trimmedStr(300),
  message: optionalStr(2000),
  type: z.enum(['info', 'warning', 'error', 'success']).optional(),
  read: z.boolean().optional(),
}).passthrough()

// ─── Projects ───────────────────────────────────────────────────────────────

export const projectSchema = z.object({
  name: trimmedStr(200),
  description: optionalStr(2000),
  status: z.enum(['active', 'completed', 'paused', 'cancelled']).optional(),
  deadline: z.string().trim().optional(),
}).passthrough()

// ─── Focus ───────────────────────────────────────────────────────────────────

export const focusSchema = z.object({
  task: trimmedStr(500),
  duration: z.number().min(1).max(480).optional(),
  notes: optionalStr(2000),
}).passthrough()
