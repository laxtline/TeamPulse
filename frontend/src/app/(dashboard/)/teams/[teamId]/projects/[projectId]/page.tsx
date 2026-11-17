'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsApi, tasksApi } from '@/lib/api'
import { PageHeader } from '@/components/layout/PageHeader'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Plus, ArrowLeft, MoreHorizontal, Settings, Users, BarChart3 } from 'lucide-react'
import { Task, Project } from '@/types'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import Link from 'next/link'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useTeamStore } from '@/store/teamStore'

export default function ProjectKanbanPage() {
  const params = useParams()
  const teamId = params.teamId as string
  const projectId = params.projectId as string
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: project, isLoading } = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => projectsApi.get(projectId),
    enabled: !!projectId,
  })

  const createTaskMutation = useMutation({
    mutationFn: (data: { title: string; description?: string; status: string; priority: string }) =>
      tasksApi.create(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] })
    },
  })

  const updateTaskMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: Partial<Task> }) =>
      tasksApi.update(projectId, taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] })
    },
  })

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => tasksApi.delete(projectId, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] })
    },
  })

  // WebSocket for real-time updates
  useWebSocket(projectId, {
    onTaskCreated: (task) => {
      queryClient.setQueryData(['projects', projectId], (old: any) => {
        if (!old) return old
        return { ...old, tasks: [...(old.tasks || []), task] }
      })
    },
    onTaskUpdated: (task) => {
      queryClient.setQueryData(['projects', projectId], (old: any) => {
        if (!old) return old
        return {
          ...old,
          tasks: old.tasks.map((t: Task) => t.id === task.id ? task : t)
        }
      })
    },
    onTaskDeleted: (taskId) => {
      queryClient.setQueryData(['projects', projectId], (old: any) => {
        if (!old) return old
        return {
          ...old,
          tasks: old.tasks.filter((t: Task) => t.id !== taskId)
        }
      })
    },
  })

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold">Project not found</h1>
        <Button variant="outline" onClick={() => router.push(`/teams/${teamId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Team
        </Button>
      </div>
    )
  }

  const columns = [
    { id: 'backlog', title: 'Backlog', status: 'backlog' },
    { id: 'todo', title: 'To Do', status: 'todo' },
    { id: 'in_progress', title: 'In Progress', status: 'in_progress' },
    { id: 'in_review', title: 'In Review', status: 'in_review' },
    { id: 'done', title: 'Done', status: 'done' },
  ]

  const tasksByStatus = columns.map(col => ({
    ...col,
    tasks: project.tasks?.filter(t => t.status === col.status) || [],
  }))

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-background">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/teams/${teamId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{project.name}</h1>
            <p className="text-sm text-surface-500">{project.key_prefix} • {project.tasks?.length || 0} tasks</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/teams/${teamId}/projects/${project.id}/analytics`}>
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </Link>
          <Link href={`/teams/${teamId}/projects/${project.id}/settings`}>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => createTaskMutation.mutate({ title: '', status: 'backlog', priority: 'medium' })}>
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-auto p-4">
        <KanbanBoard
          columns={tasksByStatus}
          onTaskMove={async (taskId, newStatus, newOrder) => {
            await updateTaskMutation.mutateAsync({
              taskId,
              data: { status: newStatus, order: newOrder },
            })
          }}
          onTaskClick={(task) => {
            router.push(`/tasks/${task.id}`)
          }}
          onCreateTask={async (status) => {
            const newTask = await tasksApi.create(projectId, {
              title: 'New Task',
              status,
              priority: 'medium',
            })
            router.push(`/tasks/${newTask.id}`)
          }}
          onDeleteTask={async (taskId) => {
            if (confirm('Delete this task?')) {
              await deleteTaskMutation.mutateAsync(taskId)
            }
          }}
        />
      </div>
    </div>
  )
}