export interface User {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  role: string
  is_active: boolean
  email_verified: boolean
  created_at: string
}

export interface Team {
  id: string
  name: string
  slug: string
  description: string | null
  owner_id: string
  created_at: string
  updated_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  user_email: string
  user_full_name: string
  user_avatar_url: string | null
  role: string
  joined_at: string
}

export interface Project {
  id: string
  team_id: string
  name: string
  description: string | null
  key_prefix: string
  created_at: string
  updated_at: string
  task_count?: number
  task_counts?: Record<string, number>
}

export interface Task {
  id: string
  project_id: string
  team_id: string
  project_key_prefix: string
  task_number: number
  title: string
  description: string | null
  status: 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignee_id: string | null
  reporter_id: string | null
  story_points: number | null
  position: number
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  assignee?: User | null
  reporter?: User | null
  tags?: string[]
  sprint_id?: string | null
  project_members?: ProjectMember[]
  ai_priority_score?: number
  ai_priority_reasoning?: string
  ai_suggested_priority?: TaskPriority
}

export interface ProjectMember {
  user_id: string
  user_full_name: string
  user_email: string
  user_avatar_url: string | null
  role: TeamRole
}

export interface Comment {
  id: string
  task_id: string
  user_id: string
  user: User
  content: string
  created_at: string
  updated_at: string
}

export interface Activity {
  id: string
  task_id: string
  user_id: string
  user: User
  action: string
  old_value: Record<string, any> | null
  new_value: Record<string, any> | null
  created_at: string
}

export interface AIPriority {
  score: number
  reasoning: string
  suggested_action: 'Do now' | 'Schedule this week' | 'Delegate' | 'Defer'
}

export interface StandupSummary {
  summary: string
  priorities: string[]
}

export interface WebSocketEvent {
  event: string
  data: any
}

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer'