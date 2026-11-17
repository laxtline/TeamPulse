'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
})

type InviteFormData = z.infer<typeof inviteSchema>

interface InviteModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: InviteFormData) => Promise<unknown>
  isLoading?: boolean
}

export function InviteModal({ isOpen, onClose, onSubmit, isLoading }: InviteModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'member' },
  })

  const handleSubmitForm = async (data: InviteFormData) => {
    await onSubmit(data)
    reset()
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invite Team Member"
      description="Enter the email address of the person you want to invite."
    >
      <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="user@example.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <div>
          <label className="label">Role</label>
          <select
            {...register('role')}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="admin">Admin</option>
            <option value="member">Member</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isLoading}>
            Send Invitation
          </Button>
        </div>
      </form>
    </Modal>
  )
}