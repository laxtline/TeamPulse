'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsApi, tasksApi, teamsApi } from '@/lib/api'
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, BarChart3, Settings } from 'lucide-react'
import { Task } from '@/types'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

// Stable empty array so the board's sync effect doesn't run on every render.
const NO_TASKS: Task[] = []

export default function ProjectKanbanPage() {
  const params = useParams()
  const teamId = params.teamId as string
  const projectId = params.projectId as string
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: session } = useSession()

  const { data: project, isLoading } = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => projectsApi.get(teamId, projectId),
    enabled: !!projectId,
  })

  const { data: tasks } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => tasksApi.list(projectId),
    enabled: !!projectId,
  })

  // The assignee picker needs the team's people; the board never received them
  // before, so the dropdown only ever showed "Unassigned".
  const { data: team } = useQuery({
    queryKey: ['teams', teamId],
    queryFn: () => teamsApi.get(teamId),
    enabled: !!teamId,
  })

  const members = (team?.members ?? []).map((member) => ({
    id: member.user_id,
    full_name: member.user_full_name,
    avatar_url: member.user_avatar_url,
  }))

  const moveTaskMutation = useMutation({
    mutationFn: ({ taskId, status, position }: { taskId: string; status: string; position: number }) =>
      tasksApi.move(projectId, taskId, { status, position }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
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
      <div className="p-6 text-center space-y-4">
        <h1 className="text-2xl font-bold">Project not found</h1>
        <Button variant="outline" onClick={() => router.push(`/teams/${teamId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Team
        </Button>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border bg-background">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/teams/${teamId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{project.name}</h1>
            <p className="text-sm text-surface-500">
              {project.key_prefix} • {tasks?.length || 0} tasks
            </p>
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
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <KanbanBoard
          projectId={projectId}
          teamId={project.team_id}
          initialTasks={tasks ?? NO_TASKS}
          currentUserId={session?.user?.id || ''}
          members={members}
          onTaskMove={(taskId, status, position) => {
            moveTaskMutation.mutate({ taskId, status, position })
          }}
          onTaskUpdate={(task: Task) => {
            queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
            queryClient.invalidateQueries({ queryKey: ['tasks', task.id] })
          }}
        />
      </div>
    </div>
  )
}
