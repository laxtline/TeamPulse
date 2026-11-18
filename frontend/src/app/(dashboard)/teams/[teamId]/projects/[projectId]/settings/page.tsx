'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { projectsApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ArrowLeft, Trash2 } from 'lucide-react'

export default function ProjectSettingsPage() {
  const params = useParams()
  const teamId = params.teamId as string
  const projectId = params.projectId as string
  const router = useRouter()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: project, isLoading } = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => projectsApi.get(teamId, projectId),
    enabled: !!projectId,
  })

  useEffect(() => {
    if (project) {
      setName(project.name)
      setDescription(project.description || '')
    }
  }, [project])

  const updateMutation = useMutation({
    mutationFn: () => projectsApi.update(teamId, projectId, { name, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] })
      setSaved(true)
      setError(null)
      setTimeout(() => setSaved(false), 2500)
    },
    onError: () => setError('Could not save the project. Try again.'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => projectsApi.delete(teamId, projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', teamId] })
      router.push(`/teams/${teamId}`)
    },
    onError: () => setError('Could not delete the project. Try again.'),
  })

  const handleDelete = () => {
    if (window.confirm(`Delete "${project?.name}"? Every task in it goes too.`)) {
      deleteMutation.mutate()
    }
  }

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
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/teams/${teamId}/projects/${projectId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Project settings</h1>
          <p className="text-sm text-surface-500">{project.key_prefix} • {project.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={255}
          />
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Description
            </label>
            <textarea
              className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={description}
              maxLength={1000}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => updateMutation.mutate()}
              loading={updateMutation.isPending}
              disabled={!name.trim()}
            >
              Save changes
            </Button>
            {saved && <span className="text-sm text-green-600 dark:text-green-400">Saved</span>}
          </div>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <p className="text-sm text-surface-500">
            Deleting a project removes its tasks, comments and history for everyone.
          </p>
          <Button variant="destructive" onClick={handleDelete} loading={deleteMutation.isPending}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete project
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
