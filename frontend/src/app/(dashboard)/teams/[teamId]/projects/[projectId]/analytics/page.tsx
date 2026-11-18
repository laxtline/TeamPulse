'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { projectsApi, tasksApi, aiApi, teamsApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { WorkloadChart } from '@/components/charts/WorkloadChart'
import { ArrowLeft } from 'lucide-react'
import { Task, TaskStatus } from '@/types'

const STATUS_LABELS: { value: TaskStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'In Review' },
  { value: 'done', label: 'Done' },
]

export default function ProjectAnalyticsPage() {
  const params = useParams()
  const teamId = params.teamId as string
  const projectId = params.projectId as string
  const router = useRouter()

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

  const { data: insights } = useQuery({
    queryKey: ['insights', projectId],
    queryFn: () => aiApi.projectInsights(projectId),
    enabled: !!projectId,
  })

  const { data: team } = useQuery({
    queryKey: ['team', teamId],
    queryFn: () => teamsApi.get(teamId),
    enabled: !!teamId,
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

  const allTasks: Task[] = tasks || []
  const totalPoints = allTasks.reduce((sum, task) => sum + (task.story_points || 0), 0)
  const donePoints = allTasks
    .filter((task) => task.status === 'done')
    .reduce((sum, task) => sum + (task.story_points || 0), 0)
  const overdue = allTasks.filter(
    (task) => task.due_date && task.status !== 'done' && new Date(task.due_date) < new Date()
  ).length

  const statusCounts = STATUS_LABELS.map((status) => ({
    ...status,
    count: allTasks.filter((task) => task.status === status.value).length,
  }))

  // The task list does not embed assignees, so resolve ids through the team's
  // member list and fall back to a short id label when someone has left.
  const nameById = (team?.members || []).reduce<Record<string, string>>((acc, member) => {
    acc[member.user_id] = member.user_full_name
    return acc
  }, {})

  const workload = Object.values(
    allTasks.reduce<Record<string, { user: string; tasks: number; points: number }>>((acc, task) => {
      const key = task.assignee_id || 'unassigned'
      if (!acc[key]) {
        acc[key] = {
          user:
            (task.assignee_id && nameById[task.assignee_id]) ||
            (task.assignee_id ? task.assignee_id.slice(0, 8) : 'Unassigned'),
          tasks: 0,
          points: 0,
        }
      }
      acc[key].tasks += 1
      acc[key].points += task.story_points || 0
      return acc
    }, {})
  ).sort((a, b) => b.tasks - a.tasks)

  const aiSummary = (insights?.ai_summary as string) || 'No AI summary available yet.'

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/teams/${teamId}/projects/${projectId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">{project.name} analytics</h1>
          <p className="text-sm text-surface-500">
            {project.key_prefix} • {allTasks.length} tasks • {totalPoints} story points
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-surface-500">Tasks</p>
            <p className="text-2xl font-semibold">{allTasks.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-surface-500">Points delivered</p>
            <p className="text-2xl font-semibold">
              {donePoints}
              <span className="text-base text-surface-400"> / {totalPoints}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-surface-500">In flight</p>
            <p className="text-2xl font-semibold">
              {allTasks.filter((task) => ['todo', 'in_progress', 'review'].includes(task.status)).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-surface-500">Overdue</p>
            <p className="text-2xl font-semibold">{overdue}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tasks by status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {statusCounts.map((status) => {
              const share = allTasks.length ? (status.count / allTasks.length) * 100 : 0
              return (
                <div key={status.value} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{status.label}</span>
                    <span className="text-surface-500">{status.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-100 dark:bg-surface-800">
                    <div
                      className="h-2 rounded-full bg-primary-500"
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <WorkloadChart data={workload} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>AI summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-surface-700 dark:text-surface-300">{aiSummary}</p>
        </CardContent>
      </Card>
    </div>
  )
}
