import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: z.string().min(1, 'Full name is required').max(255),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const teamCreateSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(255),
  description: z.string().max(1000).optional(),
})

export const teamUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
})

export const memberInviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
})

export const memberUpdateSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer']),
})

export const projectCreateSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(255),
  description: z.string().max(1000).optional(),
  key_prefix: z.string().min(2, 'Key prefix must be at least 2 characters').max(10).regex(/^[A-Z]+$/, 'Key prefix must be uppercase letters only'),
})

export const projectUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
})

export const taskCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().max(5000).optional(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']).default('backlog'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assignee_id: z.string().uuid().optional().nullable(),
  story_points: z.number().min(0).max(100).optional().nullable(),
  due_date: z.string().datetime().optional().nullable(),
})

export const taskUpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignee_id: z.string().uuid().optional().nullable(),
  story_points: z.number().min(0).max(100).optional().nullable(),
  due_date: z.string().datetime().optional().nullable(),
})

export const taskMoveSchema = z.object({
  status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']),
  position: z.number(),
})

export const taskAssignSchema = z.object({
  assignee_id: z.string().uuid().optional().nullable(),
})

export const commentCreateSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(5000),
})

export const commentUpdateSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(5000),
})