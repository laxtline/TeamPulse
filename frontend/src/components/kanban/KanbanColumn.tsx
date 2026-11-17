'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Plus, GripVertical } from 'lucide-react'
import { KanbanCard } from './KanbanCard'
import { Task, TaskStatus } from '@/types'
import { useDroppable } from '@dnd-kit/core'
import { Button } from '@/components/ui/Button'

interface KanbanColumnProps {
  status: TaskStatus
  title: string
  tasks: Task[]
  onTaskMove: (taskId: string, status: TaskStatus, position: number) => void
  onTaskClick: (task: Task) => void
  onAddTask: () => void
}

export function KanbanColumn({ status, title, tasks, onTaskMove, onTaskClick, onAddTask }: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const { setNodeRef, isOver } = useDroppable({ id: status })

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('taskId')
    const sourceStatus = e.dataTransfer.getData('sourceStatus')
    const sourceIndex = parseInt(e.dataTransfer.getData('sourceIndex'), 10)

    if (taskId && sourceStatus) {
      const targetIndex = tasks.length
      onTaskMove(taskId, status, targetIndex * 10)
    }
  }

  return (
    <div
      ref={setNodeRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cn(
        'kanban-column flex flex-col min-h-[500px]',
        isOver && 'bg-primary-50/50 dark:bg-primary-900/10 ring-2 ring-primary-500/50'
      )}
    >
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="font-semibold text-surface-900 dark:text-surface-100">{title}</h3>
        <span className="text-sm text-surface-500 dark:text-surface-400">{tasks.length}</span>
      </div>

      <div
        className="flex-1 overflow-y-auto p-2 space-y-2"
        role="list"
        aria-label={`${title} tasks`}
      >
        {tasks.map((task, index) => (
          <KanbanCard
            key={task.id}
            task={task}
            index={index}
            sourceStatus={status}
            onClick={() => onTaskClick(task)}
            onTaskMove={onTaskMove}
          />
        ))}
        {tasks.length === 0 && (
          <div className="h-20 border-2 border-dashed border-border rounded-lg flex items-center justify-center">
            <span className="text-surface-400 text-sm">Drop tasks here</span>
          </div>
        )}
      </div>

      <Button variant="ghost" size="sm" className="w-full justify-start px-3" onClick={onAddTask}>
        <Plus className="h-4 w-4 mr-2" />
        Add task
      </Button>
    </div>
  )
}