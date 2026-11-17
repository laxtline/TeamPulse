'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Task, User } from '@/types'
import { getPriorityColor, getStatusColor } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { TASK_STATUSES, TASK_PRIORITIES, STORY_POINTS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().max(5000).optional(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']).default('backlog'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assignee_id: z.string().uuid().optional().nullable(),
  story_points: z.number().min(0).max(100).optional().nullable(),
  due_date: z.string().datetime().optional().nullable(),
})

type TaskFormData = z.infer<typeof taskSchema>

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  task: Task | null
  projectId: string
  defaultStatus: string
  onSubmit: (data: TaskFormData) => Promise<void>
  onUpdate?: (task: Task) => void
  members: User[]
}

export function TaskModal({
  isOpen,
  onClose,
  task,
  projectId,
  defaultStatus,
  onSubmit,
  onUpdate,
  members,
}: TaskModalProps) {
  const isEditing = !!task
  const [dueDate, setDueDate] = useState<string>('')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      status: task?.status || defaultStatus,
      priority: task?.priority || 'medium',
      assignee_id: task?.assignee_id || null,
      story_points: task?.story_points || null,
      due_date: task?.due_date || null,
    },
  })

  const watchedStatus = watch('status')
  const watchedAssignee = watch('assignee_id')

  const handleSubmitForm = async (data: TaskFormData) => {
    const submitData = {
      ...data,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
    }
    await onSubmit(submitData)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Task' : 'Create Task'}
      size="lg"
    >
      <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-4">
        <Input
          label="Title"
          placeholder="Enter task title"
          error={errors.title?.message}
          {...register('title')}
        />

        <div>
          <label className="label">Description</label>
          <textarea
            {...register('description')}
            className="mt-1 min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Add details..."
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Status</label>
            <select
              {...register('status')}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {TASK_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Priority</label>
            <select
              {...register('priority')}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {TASK_PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Assignee</label>
          <select
            {...register('assignee_id')}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.full_name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Story Points</label>
            <select
              {...register('story_points', { valueAsNumber: true })}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">None</option>
              {STORY_POINTS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Due Date</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        {task?.assignee && (
          <div className="flex items-center gap-2 p-3 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
            <Avatar src={task.assignee.avatar_url} name={task.assignee.full_name} size="sm" />
            <div>
              <p className="text-sm font-medium">Assigned to</p>
              <p className="text-sm text-surface-600 dark:text-surface-400">{task.assignee.full_name}</p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {isEditing ? 'Save Changes' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}