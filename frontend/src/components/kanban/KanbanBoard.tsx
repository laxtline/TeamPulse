'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { KanbanColumn } from './KanbanColumn'
import { TaskModal } from './TaskModal'
import { useWebSocket } from '@/hooks/useWebSocket'
import { Task, TaskStatus } from '@/types'
import { tasksApi } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import { KANBAN_COLUMNS, TASK_STATUSES } from '@/lib/constants'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface KanbanBoardProps {
  projectId: string
  teamId: string
  initialTasks: Task[]
  currentUserId: string
  onTaskMove?: (taskId: string, status: TaskStatus, position: number) => void
  onTaskUpdate?: (task: Task) => void
}

export function KanbanBoard({
  projectId,
  teamId,
  initialTasks,
  currentUserId,
  onTaskMove,
  onTaskUpdate,
}: KanbanBoardProps) {
  const queryClient = useQueryClient()
  const [tasks, setTasks] = useState<Task[]>(initialTasks)

  // The board can mount before the project's tasks finish loading, so sync up
  // once the query hands them over.
  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [creatingTaskStatus, setCreatingTaskStatus] = useState<TaskStatus>('backlog')

  const handleTaskMove = (taskId: string, status: TaskStatus, position: number) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, status, position } : task
      )
    )
    onTaskMove?.(taskId, status, position)
  }

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks((prev) => prev.map((task) => (task.id === updatedTask.id ? updatedTask : task)))
    onTaskUpdate?.(updatedTask)
    queryClient.invalidateQueries({ queryKey: ['tasks', updatedTask.id] })
  }

  const handleCreateTask = async (data: any) => {
    const newTask = await tasksApi.create(projectId, { ...data, status: creatingTaskStatus })
    setTasks((prev) => [...prev, newTask])
    queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
    setIsModalOpen(false)
  }

  const handleWebSocketTaskMoved = (data: any) => {
    if (data.user.id === currentUserId) return
    setTasks((prev) =>
      prev.map((task) =>
        task.id === data.task_id
          ? { ...task, status: data.new_status, position: data.position }
          : task
      )
    )
  }

  const handleWebSocketTaskCreated = (data: any) => {
    if (data.user.id === currentUserId) return
    queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
  }

  const handleWebSocketTaskDeleted = (data: any) => {
    if (data.user.id === currentUserId) return
    setTasks((prev) => prev.filter((task) => task.id !== data.task_id))
  }

  useWebSocket({
    teamId,
    onTaskMoved: handleWebSocketTaskMoved,
    onTaskCreated: handleWebSocketTaskCreated,
    onTaskDeleted: handleWebSocketTaskDeleted,
  })

  const columns = KANBAN_COLUMNS.map((status) => {
    const columnTasks = tasks
      .filter((task) => task.status === status)
      .sort((a, b) => a.position - b.position)

    const statusInfo = TASK_STATUSES.find((s) => s.value === status)!

    return (
      <KanbanColumn
        key={status}
        status={status}
        title={statusInfo.label}
        tasks={columnTasks}
        onTaskMove={handleTaskMove}
        onTaskClick={(task) => {
          setSelectedTask(task)
          setIsModalOpen(true)
        }}
        onAddTask={() => {
          setCreatingTaskStatus(status)
          setSelectedTask(null)
          setIsModalOpen(true)
        }}
      />
    )
  })

  return (
    <div className="flex h-[calc(100vh-200px)] overflow-x-auto gap-4 p-4 pb-8">
      {columns}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        task={selectedTask}
        projectId={projectId}
        defaultStatus={creatingTaskStatus}
        onSubmit={handleCreateTask}
        onUpdate={handleTaskUpdate}
      />
    </div>
  )
}