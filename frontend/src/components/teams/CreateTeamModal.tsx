'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(255),
  description: z.string().max(1000).optional(),
})

type CreateTeamFormData = z.infer<typeof createTeamSchema>

interface CreateTeamModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateTeamFormData) => Promise<void>
  isLoading?: boolean
}

export function CreateTeamModal({ isOpen, onClose, onSubmit, isLoading }: CreateTeamModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateTeamFormData>({
    resolver: zodResolver(createTeamSchema),
  })

  const handleSubmitForm = async (data: CreateTeamFormData) => {
    await onSubmit(data)
    reset()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Team"
      description="Set up a new workspace for your team."
    >
      <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-4">
        <Input
          label="Team Name"
          placeholder="e.g., Acme Corp"
          error={errors.name?.message}
          {...register('name')}
        />

        <div>
          <label className="label">Description (optional)</label>
          <textarea
            {...register('description')}
            rows={3}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Brief description of your team..."
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
            Create Team
          </Button>
        </div>
      </form>
    </Modal>
  )
}