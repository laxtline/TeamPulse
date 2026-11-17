export const TASK_STATUSES = [
  { value: 'backlog', label: 'Backlog', color: 'bg-surface-100 text-surface-800' },
  { value: 'todo', label: 'To Do', color: 'bg-orange-100 text-orange-800' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
  { value: 'review', label: 'Review', color: 'bg-purple-100 text-purple-800' },
  { value: 'done', label: 'Done', color: 'bg-green-100 text-green-800' },
] as const

export const TASK_PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' },
] as const

export const TEAM_ROLES = [
  { value: 'owner', label: 'Owner', color: 'bg-purple-100 text-purple-800' },
  { value: 'admin', label: 'Admin', color: 'bg-blue-100 text-blue-800' },
  { value: 'member', label: 'Member', color: 'bg-green-100 text-green-800' },
  { value: 'viewer', label: 'Viewer', color: 'bg-surface-100 text-surface-800' },
] as const

export const KANBAN_COLUMNS = TASK_STATUSES.map((s) => s.value)

export const STORY_POINTS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89] as const

export const PRIORITY_ACTIONS = [
  'Do now',
  'Schedule this week',
  'Delegate',
  'Defer',
] as const