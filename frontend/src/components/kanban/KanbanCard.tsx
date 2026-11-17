'use client'

import { cn } from '@/lib/utils'
import { GripVertical, Clock, UserCircle } from 'lucide-react'
import { Task } from '@/types'
import { getPriorityColor, getStatusColor, formatRelativeTime } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface KanbanCardProps {
  task: Task
  index: number
  sourceStatus: string
  onClick: () => void
  onTaskMove: (taskId: string, status: string, position: number) => void
}

export function KanbanCard({ task, index, sourceStatus, onClick, onTaskMove }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { task, sourceStatus } })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('taskId', task.id)
    e.dataTransfer.setData('sourceStatus', sourceStatus)
    e.dataTransfer.setData('sourceIndex', index.toString())
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('kanban-card', isDragging && 'dragging')}
      onClick={onClick}
      onDragStart={handleDragStart}
      draggable
      {...attributes}
      {...listeners}
      role="listitem"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <GripVertical
            className="h-5 w-5 text-surface-300 dark:text-surface-600 cursor-grab hover:text-surface-500 shrink-0 mr-2"
            aria-label="Drag to reorder"
          />
          <h4 className="font-medium text-surface-900 dark:text-surface-100 truncate">{task.title}</h4>
        </div>
        <Badge variant="outline" className={getPriorityColor(task.priority)}>
          {task.priority}
        </Badge>
      </div>

      {task.description && (
        <p className="mt-2 text-sm text-surface-600 dark:text-surface-400 line-clamp-2">
          {task.description}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        {task.assignee && (
          <Avatar
            src={task.assignee.avatar_url}
            name={task.assignee.full_name}
            size="sm"
            className="cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          />
        )}
        {task.due_date && (
          <span className="flex items-center gap-1 text-xs text-surface-500 dark:text-surface-400">
            <Clock className="h-3 w-3" />
            {new Date(task.due_date) < new Date() ? 'Overdue' : formatRelativeTime(task.due_date)}
          </span>
        )}
        {task.story_points && (
          <Badge variant="secondary" className="text-xs">
            {task.story_points} pts
          </Badge>
        )}
      </div>
    </div>
  )
}