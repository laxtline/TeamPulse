'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teamsApi } from '@/lib/api'
import { PageHeader } from '@/components/layout/PageHeader'
import { TeamCard } from '@/components/teams/TeamCard'
import { CreateTeamModal } from '@/components/teams/CreateTeamModal'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Plus, Users } from 'lucide-react'
import { Team } from '@/types'

export default function TeamsPage() {
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const { data: teams, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: teamsApi.list,
  })

  const createMutation = useMutation({
    mutationFn: teamsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
      setIsCreateOpen(false)
    },
  })

  const handleCreateTeam = async (data: { name: string; description?: string }) => {
    await createMutation.mutateAsync(data)
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Teams"
        description="Manage your team workspaces"
        action={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Team
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      ) : !teams?.length ? (
        <div className="text-center py-16">
          <Users className="h-16 w-16 mx-auto text-surface-300 dark:text-surface-600 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No teams yet</h3>
          <p className="text-surface-500 mb-6">Create your first team to start collaborating</p>
          <Button onClick={() => setIsCreateOpen(true)} size="lg">
            <Plus className="h-4 w-4 mr-2" />
            Create Team
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams?.map((team) => (
            <TeamCard key={team.id} team={team} userRole="member" />
          ))}
        </div>
      )}

      <CreateTeamModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateTeam}
        isLoading={createMutation.isPending}
      />
    </div>
  )
}