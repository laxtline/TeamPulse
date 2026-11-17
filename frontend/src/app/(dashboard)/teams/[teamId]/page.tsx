'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teamsApi, projectsApi } from '@/lib/api'
import { PageHeader } from '@/components/layout/PageHeader'
import { MemberTable } from '@/components/teams/MemberTable'
import { InviteModal } from '@/components/teams/InviteModal'
import { CreateTeamModal } from '@/components/teams/CreateTeamModal'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { Plus, Users, FolderKanban, Settings, MoreHorizontal } from 'lucide-react'
import { getRoleColor } from '@/lib/utils'
import { Team, TeamMember, Project } from '@/types'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export default function TeamDetailPage() {
  const params = useParams()
  const teamId = params.teamId as string
  const queryClient = useQueryClient()
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const { data: team, isLoading } = useQuery({
    queryKey: ['teams', teamId],
    // Links use the slug because it reads better in the address bar, but the
    // API wants the team id, so look the team up first.
    queryFn: async () => {
      const teams = await teamsApi.list()
      const match = teams.find((t) => t.id === teamId || t.slug === teamId)
      if (!match) throw new Error('Team not found')
      return teamsApi.get(match.id)
    },
    enabled: !!teamId,
  })

  const updateMemberMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      teamsApi.updateMember(team?.id ?? teamId, userId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', teamId] })
    },
  })

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => teamsApi.removeMember(team?.id ?? teamId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', teamId] })
    },
  })

  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      teamsApi.inviteMember(team?.id ?? teamId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', teamId] })
      setIsInviteOpen(false)
    },
  })

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!team) {
    return (
      <div className="p-6 text-center">
        <h1 className="text-2xl font-bold">Team not found</h1>
      </div>
    )
  }

  const isOwner = team.owner_id === team.members?.find(m => m.user_id === team.owner_id)?.user_id

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={team.name}
        description={team.description || 'Team workspace for collaboration'}
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsInviteOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
            {isOwner && (
              <Button variant="outline" onClick={() => setIsSettingsOpen(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            )}
          </div>
        }
      />

      <Tabs defaultValue="overview" onValueChange={(v) => {}}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          {isOwner && <TabsTrigger value="settings">Settings</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{team.projects?.length || 0}</p>
                <p className="text-surface-500">Total projects</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Members</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{team.members?.length || 0}</p>
                <p className="text-surface-500">Team members</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{team.projects?.reduce((acc, p) => acc + (p.task_count || 0), 0) || 0}</p>
                <p className="text-surface-500">Total tasks</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Projects</CardTitle>
              </CardHeader>
              <CardContent>
                {team.projects?.length === 0 ? (
                  <p className="text-surface-500 text-center py-8">No projects yet</p>
                ) : (
                  <div className="space-y-3">
                    {team.projects?.slice(0, 5).map((project) => (
                      <div key={project.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                            <FolderKanban className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                          </div>
                          <div>
                            <p className="font-medium">{project.name}</p>
                            <p className="text-sm text-surface-500">{project.key_prefix} • {project.task_count || 0} tasks</p>
                          </div>
                        </div>
                        <Badge variant="secondary">{project.task_count || 0} tasks</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {team.members?.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Avatar src={member.user_avatar_url} name={member.user_full_name} size="sm" />
                        <div>
                          <p className="font-medium">{member.user_full_name}</p>
                          <p className="text-sm text-surface-500">{member.user_email}</p>
                        </div>
                        <Badge variant="outline" className={getRoleColor(member.role)}>
                          {member.role}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projects">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {team.projects?.map((project) => (
              <Link key={project.id} href={`/teams/${team.id}/projects/${project.id}`}>
                <Card className="h-full hover:border-primary-400 transition-colors">
                  <CardContent className="p-6 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                        <FolderKanban className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div>
                        <p className="font-medium">{project.name}</p>
                        <p className="text-sm text-surface-500">{project.key_prefix}</p>
                      </div>
                    </div>
                    {project.description && (
                      <p className="text-sm text-surface-500 line-clamp-2">{project.description}</p>
                    )}
                    <Badge variant="secondary">{project.task_count || 0} tasks</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="members">
          <MemberTable
            members={team.members || []}
            currentUserId=""
            currentUserRole="owner"
            onUpdateRole={(userId, role) => updateMemberMutation.mutate({ userId, role })}
            onRemoveMember={(userId) => removeMemberMutation.mutate(userId)}
          />
        </TabsContent>

        {isOwner && (
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Team Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="label">Team Name</label>
                  <input
                    defaultValue={team.name}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea
                    defaultValue={team.description || ''}
                    rows={3}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="border-t border-border pt-4">
                  <h4 className="font-medium text-red-600 mb-2">Danger Zone</h4>
                  <p className="text-sm text-surface-500 mb-4">Deleting this team will permanently remove all projects, tasks, and member data.</p>
                  <Button variant="destructive">Delete Team</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <InviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        onSubmit={inviteMutation.mutateAsync}
        isLoading={inviteMutation.isPending}
      />
    </div>
  )
}