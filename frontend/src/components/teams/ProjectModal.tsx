'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { projectsApi } from '@/lib/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(255),
  key_prefix: z.string().min(1, 'Key prefix is required').max(10).toUpperCase(),
  description: z.string().max(1000).optional(),
})

type ProjectFormData = z.infer<typeof projectSchema>

interface ProjectModalProps {
  teamId: string
  isOpen: boolean
  onClose: () => void
  project?: {
    id: string
    name: string
    key_prefix: string
    description?: string | null
  }
}

export function ProjectModal({ teamId, isOpen, onClose, project }: ProjectModalProps) {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      key_prefix: '',
      description: '',
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: ProjectFormData) => projectsApi.create(teamId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', teamId] })
      queryClient.invalidateQueries({ queryKey: ['projects', teamId] })
      toast.success('Project created successfully')
      reset()
      onClose()
    },
    onError: () => {
      toast.error('Failed to create project')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: ProjectFormData) => projectsApi.update(teamId, project!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams', teamId] })
      queryClient.invalidateQueries({ queryKey: ['projects', teamId] })
      toast.success('Project updated successfully')
      reset()
      onClose()
    },
    onError: () => {
      toast.error('Failed to update project')
    },
  })

  const isEditing = !!project
  const isLoading = createMutation.isPending || updateMutation.isPending

  const handleSubmitForm = async (data: ProjectFormData) => {
    if (isEditing) {
      await updateMutation.mutateAsync(data)
    } else {
      await createMutation.mutateAsync(data)
    }
  }

  // Populate form when editing
  if (isEditing && project) {
    setValue('name', project.name)
    setValue('key_prefix', project.key_prefix)
    setValue('description', project.description || '')
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Project' : 'New Project'}
      description={isEditing ? 'Update project details' : 'Create a new project for your team'}
    >
      <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-4">
        <Input
          label="Project Name"
          placeholder="e.g., Website Redesign"
          error={errors.name?.message}
          {...register('name')}
        />

        <Input
          label="Key Prefix"
          placeholder="WEB, MOB, API"
          error={errors.key_prefix?.message}
          {...register('key_prefix')}
          maxLength={10}
        />

        <div>
          <label className="label">Description (optional)</label>
          <Textarea
            {...register('description')}
            rows={3}
            placeholder="Brief description of the project..."
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isLoading}>
            {isEditing ? 'Save Changes' : 'Create Project'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}