'use client'

import { Task } from '@/types'
import { getPriorityColor, getStatusColor, formatDate, formatRelativeTime } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Calendar, UserCircle, Flag, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaskHeaderProps {
  task: Task
}

export function TaskHeader({ task }: TaskHeaderProps) {
  return (
    <div className="space-y-4 pb-4 border-b border-border">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">
            {task.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={getStatusColor(task.status)}>
              {task.status.replace('_', ' ')}
            </Badge>
            <Badge variant="outline" className={getPriorityColor(task.priority)}>
              {task.priority}
            </Badge>
            {task.story_points && (
              <Badge variant="secondary">
                <Tag className="h-3 w-3 mr-1" />
                {task.story_points} pts
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm text-surface-600 dark:text-surface-400">
        {task.assignee && (
          <div className="flex items-center gap-2">
            <Avatar src={task.assignee.avatar_url} name={task.assignee.full_name} size="sm" />
            <span>{task.assignee.full_name}</span>
          </div>
        )}

        {task.reporter && (
          <div className="flex items-center gap-2">
            <UserCircle className="h-4 w-4" />
            <span>Reported by {task.reporter.full_name}</span>
          </div>
        )}

        {task.due_date && (
          <div className={cn('flex items-center gap-2', new Date(task.due_date) < new Date() && 'text-red-600')}>
            <Calendar className="h-4 w-4" />
            <span>
              Due {formatDate(task.due_date)} ({formatRelativeTime(task.due_date)})
            </span>
          </div>
        )}

        {task.project_id && (
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4" />
            <span>Project: {task.project_id}</span>
          </div>
        )}
      </div>

      {task.description && (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <p className="whitespace-pre-wrap">{task.description}</p>
        </div>
      )}
    </div>
  )
}