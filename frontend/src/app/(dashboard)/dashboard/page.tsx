'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { teamsApi, projectsApi, tasksApi, aiApi } from '@/lib/api'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { StandupSummary } from '@/components/ai/StandupSummary'
import { VelocityChart } from '@/components/charts/VelocityChart'
import { WorkloadChart } from '@/components/charts/WorkloadChart'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { formatRelativeTime, getPriorityColor, getStatusColor, cn } from '@/lib/utils'
import { Task, Team } from '@/types'
import { Calendar, Flag, Users } from 'lucide-react'

export default function DashboardPage() {
  const { data: session } = useSession()

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: teamsApi.list,
  })

  const { data: myTasks } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: async () => {
      if (!teams) return []
      const allTasks: Task[] = []
      for (const team of teams) {
        // The teams list endpoint only returns the team itself, not its
        // projects, so fetch them when they are missing.
        const projects = team.projects?.length
          ? team.projects
          : await projectsApi.list(team.id)
        for (const project of projects) {
          const tasks = await tasksApi.list(project.id, { assignee_id: session?.user?.id })
          allTasks.push(...tasks)
        }
      }
      return allTasks.sort((a, b) => {
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      }).slice(0, 5)
    },
    enabled: !!teams && !!session?.user,
  })

  const { data: velocityData } = useQuery({
    queryKey: ['velocity'],
    queryFn: async () => {
      // Mock velocity data
      return [
        { sprint: 'Sprint 1', completed: 23, committed: 25 },
        { sprint: 'Sprint 2', completed: 31, committed: 30 },
        { sprint: 'Sprint 3', completed: 28, committed: 32 },
        { sprint: 'Sprint 4', completed: 35, committed: 35 },
        { sprint: 'Sprint 5', completed: 42, committed: 40 },
      ]
    },
  })

  const { data: workloadData } = useQuery({
    queryKey: ['workload'],
    queryFn: async () => {
      if (!teams) return []
      return [
        { user: 'Arjun Sharma', tasks: 8, points: 21 },
        { user: 'Priya Patel', tasks: 6, points: 18 },
        { user: 'Rohan Verma', tasks: 4, points: 13 },
      ]
    },
    enabled: !!teams,
  })

  const dueSoonTasks = myTasks?.filter((t) => t.due_date && new Date(t.due_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) || []

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your tasks and team activity"
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">My Tasks (Due Soon)</h3>
            {dueSoonTasks.length === 0 ? (
              <p className="text-surface-500 text-center py-8">No upcoming tasks</p>
            ) : (
              <div className="space-y-3">
                {dueSoonTasks.map((task) => (
                  <Link key={task.id} href={`/tasks/${task.id}`} className="block">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-surface-50 dark:bg-surface-800/50 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-sm text-surface-500">
                          <Badge variant="outline" className={cn(getStatusColor(task.status), 'text-xs')}>
                            {task.status.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline" className={cn(getPriorityColor(task.priority), 'text-xs')}>
                            {task.priority}
                          </Badge>
                          {task.due_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatRelativeTime(task.due_date)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardContent className="p-6">
            <StandupSummary userName={session?.user?.full_name || 'User'} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <VelocityChart data={velocityData || []} />
        <WorkloadChart data={workloadData || []} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Your Teams
            </h3>
            {!teams?.length ? (
              <p className="text-surface-500 text-center py-8">No teams yet</p>
            ) : (
              <div className="space-y-3">
                {teams?.map((team) => (
                  <Link key={team.id} href={`/teams/${team.id}`} className="block">
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                          <p className="font-medium">{team.name}</p>
                          <p className="text-sm text-surface-500">@{team.slug}</p>
                        </div>
                      </div>
                      <Flag className="h-5 w-5 text-surface-400" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Recent Activity</h3>
            <p className="text-surface-500 text-center py-8">Activity feed coming soon</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
